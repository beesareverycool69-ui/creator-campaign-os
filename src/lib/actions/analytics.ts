"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOwnedCampaignCreator, requireUser } from "@/lib/auth/access";
import {
  affiliateConversions,
  affiliateClicks,
  campaignCreators,
  campaigns,
  brandCreators,
  brands,
  creators,
} from "@/lib/db/schema";
import { eq, sql, and, gte, desc, sum, count } from "drizzle-orm";

export interface ConversionStats {
  totalRevenue: number;
  totalCommission: number;
  totalConversions: number;
  avgOrderValue: number;
  conversionRate: number;
}

export interface CreatorPerformance {
  creatorId: string;
  creatorName: string;
  campaignCreatorId: string;
  affiliateCode: string | null;
  conversions: number;
  revenue: number;
  commission: number;
  clicks: number;
}

export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  brandName: string;
  creators: number;
  conversions: number;
  revenue: number;
  commission: number;
}

export interface DailyStats {
  date: string;
  conversions: number;
  revenue: number;
}

export interface PendingConversion {
  id: string;
  orderId: string;
  creatorName: string;
  campaignName: string;
  affiliateCode: string | null;
  orderValue: number;
  commission: number;
  currency: string | null;
  convertedAt: Date;
}

export async function getOverallStats(): Promise<ConversionStats> {
  const user = await requireUser();

  const [stats] = await db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(CAST(${affiliateConversions.orderValue} AS DECIMAL)), 0)`,
      totalCommission: sql<number>`COALESCE(SUM(CAST(${affiliateConversions.commission} AS DECIMAL)), 0)`,
      totalConversions: count(),
    })
    .from(affiliateConversions)
    .innerJoin(
      campaignCreators,
      eq(affiliateConversions.campaignCreatorId, campaignCreators.id)
    )
    .innerJoin(campaigns, eq(campaignCreators.campaignId, campaigns.id))
    .innerJoin(brands, eq(campaigns.brandId, brands.id))
    .where(
      and(
        eq(affiliateConversions.status, "confirmed"),
        eq(brands.userId, user.id)
      )
    );

  const [clickStats] = await db
    .select({ totalClicks: count() })
    .from(affiliateClicks)
    .innerJoin(campaignCreators, eq(affiliateClicks.campaignCreatorId, campaignCreators.id))
    .innerJoin(campaigns, eq(campaignCreators.campaignId, campaigns.id))
    .innerJoin(brands, eq(campaigns.brandId, brands.id))
    .where(eq(brands.userId, user.id));

  const totalConversions = stats?.totalConversions || 0;
  const totalClicks = clickStats?.totalClicks || 0;

  return {
    totalRevenue: Number(stats?.totalRevenue || 0),
    totalCommission: Number(stats?.totalCommission || 0),
    totalConversions,
    avgOrderValue: totalConversions > 0 
      ? Number(stats?.totalRevenue || 0) / totalConversions 
      : 0,
    conversionRate: totalClicks > 0 
      ? (totalConversions / totalClicks) * 100 
      : 0,
  };
}

export async function getTopCreators(limit = 10): Promise<CreatorPerformance[]> {
  const user = await requireUser();

  // Get confirmed conversion stats grouped by campaign creator
  const conversionStats = await db
    .select({
      campaignCreatorId: affiliateConversions.campaignCreatorId,
      conversions: count(),
      revenue: sql<number>`COALESCE(SUM(CAST(${affiliateConversions.orderValue} AS DECIMAL)), 0)`,
      commission: sql<number>`COALESCE(SUM(CAST(${affiliateConversions.commission} AS DECIMAL)), 0)`,
    })
    .from(affiliateConversions)
    .innerJoin(
      campaignCreators,
      eq(affiliateConversions.campaignCreatorId, campaignCreators.id)
    )
    .innerJoin(campaigns, eq(campaignCreators.campaignId, campaigns.id))
    .innerJoin(brands, eq(campaigns.brandId, brands.id))
    .where(
      and(
        eq(affiliateConversions.status, "confirmed"),
        eq(brands.userId, user.id)
      )
    )
    .groupBy(affiliateConversions.campaignCreatorId)
    .orderBy(desc(sql`SUM(CAST(${affiliateConversions.orderValue} AS DECIMAL))`))
    .limit(limit);

  // Get click stats
  const clickStats = await db
    .select({
      campaignCreatorId: affiliateClicks.campaignCreatorId,
      clicks: count(),
    })
    .from(affiliateClicks)
    .innerJoin(campaignCreators, eq(affiliateClicks.campaignCreatorId, campaignCreators.id))
    .innerJoin(campaigns, eq(campaignCreators.campaignId, campaigns.id))
    .innerJoin(brands, eq(campaigns.brandId, brands.id))
    .where(eq(brands.userId, user.id))
    .groupBy(affiliateClicks.campaignCreatorId);

  const clickMap = new Map(clickStats.map(c => [c.campaignCreatorId, c.clicks]));

  // Get creator details
  const results: CreatorPerformance[] = [];
  
  for (const stat of conversionStats) {
    const [details] = await db
      .select({
        creatorId: creators.id,
        creatorName: creators.name,
        affiliateCode: campaignCreators.affiliateCode,
      })
      .from(campaignCreators)
      .innerJoin(campaigns, eq(campaignCreators.campaignId, campaigns.id))
      .innerJoin(brands, eq(campaigns.brandId, brands.id))
      .innerJoin(brandCreators, eq(campaignCreators.brandCreatorId, brandCreators.id))
      .innerJoin(creators, eq(brandCreators.creatorId, creators.id))
      .where(and(eq(campaignCreators.id, stat.campaignCreatorId), eq(brands.userId, user.id)))
      .limit(1);

    if (details) {
      results.push({
        creatorId: details.creatorId,
        creatorName: details.creatorName,
        campaignCreatorId: stat.campaignCreatorId,
        affiliateCode: details.affiliateCode,
        conversions: stat.conversions,
        revenue: Number(stat.revenue),
        commission: Number(stat.commission),
        clicks: clickMap.get(stat.campaignCreatorId) || 0,
      });
    }
  }

  return results;
}

export async function getCampaignPerformance(): Promise<CampaignPerformance[]> {
  const user = await requireUser();

  const campaignList = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      brandId: campaigns.brandId,
    })
    .from(campaigns)
    .innerJoin(brands, eq(campaigns.brandId, brands.id))
    .where(eq(brands.userId, user.id))
    .orderBy(desc(campaigns.createdAt));

  const results: CampaignPerformance[] = [];

  for (const campaign of campaignList) {
    // Get brand name
    const [brand] = await db
      .select({ name: brands.name })
      .from(brands)
      .where(and(eq(brands.id, campaign.brandId), eq(brands.userId, user.id)))
      .limit(1);

    // Get creator count
    const [creatorCount] = await db
      .select({ count: count() })
      .from(campaignCreators)
      .where(eq(campaignCreators.campaignId, campaign.id));

    // Get confirmed conversion stats for this campaign
    const [convStats] = await db
      .select({
        conversions: count(),
        revenue: sql<number>`COALESCE(SUM(CAST(${affiliateConversions.orderValue} AS DECIMAL)), 0)`,
        commission: sql<number>`COALESCE(SUM(CAST(${affiliateConversions.commission} AS DECIMAL)), 0)`,
      })
      .from(affiliateConversions)
      .innerJoin(
        campaignCreators,
        eq(affiliateConversions.campaignCreatorId, campaignCreators.id)
      )
      .where(
        and(
          eq(campaignCreators.campaignId, campaign.id),
          eq(affiliateConversions.status, "confirmed")
        )
      );

    results.push({
      campaignId: campaign.id,
      campaignName: campaign.name,
      brandName: brand?.name || "Unknown",
      creators: creatorCount?.count || 0,
      conversions: convStats?.conversions || 0,
      revenue: Number(convStats?.revenue || 0),
      commission: Number(convStats?.commission || 0),
    });
  }

  return results;
}

export async function getDailyStats(days = 30): Promise<DailyStats[]> {
  const user = await requireUser();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const dailyData = await db
    .select({
      date: sql<string>`DATE(${affiliateConversions.convertedAt})`,
      conversions: count(),
      revenue: sql<number>`COALESCE(SUM(CAST(${affiliateConversions.orderValue} AS DECIMAL)), 0)`,
    })
    .from(affiliateConversions)
    .innerJoin(
      campaignCreators,
      eq(affiliateConversions.campaignCreatorId, campaignCreators.id)
    )
    .innerJoin(campaigns, eq(campaignCreators.campaignId, campaigns.id))
    .innerJoin(brands, eq(campaigns.brandId, brands.id))
    .where(
      and(
        gte(affiliateConversions.convertedAt, startDate),
        eq(affiliateConversions.status, "confirmed"),
        eq(brands.userId, user.id)
      )
    )
    .groupBy(sql`DATE(${affiliateConversions.convertedAt})`)
    .orderBy(sql`DATE(${affiliateConversions.convertedAt})`);

  return dailyData.map(d => ({
    date: d.date,
    conversions: d.conversions,
    revenue: Number(d.revenue),
  }));
}

export async function getPendingConversions(): Promise<PendingConversion[]> {
  const user = await requireUser();

  const pendingConversions = await db
    .select({
      id: affiliateConversions.id,
      orderId: affiliateConversions.orderId,
      creatorName: creators.name,
      campaignName: campaigns.name,
      affiliateCode: campaignCreators.affiliateCode,
      orderValue: affiliateConversions.orderValue,
      commission: affiliateConversions.commission,
      currency: affiliateConversions.currency,
      convertedAt: affiliateConversions.convertedAt,
    })
    .from(affiliateConversions)
    .innerJoin(
      campaignCreators,
      eq(affiliateConversions.campaignCreatorId, campaignCreators.id)
    )
    .innerJoin(brandCreators, eq(campaignCreators.brandCreatorId, brandCreators.id))
    .innerJoin(creators, eq(brandCreators.creatorId, creators.id))
    .innerJoin(campaigns, eq(campaignCreators.campaignId, campaigns.id))
    .innerJoin(brands, eq(campaigns.brandId, brands.id))
    .where(
      and(
        eq(affiliateConversions.status, "pending"),
        eq(brands.userId, user.id)
      )
    )
    .orderBy(desc(affiliateConversions.convertedAt));

  return pendingConversions.map((conversion) => ({
    ...conversion,
    orderValue: Number(conversion.orderValue),
    commission: Number(conversion.commission),
  }));
}

export async function updateConversionStatus(formData: FormData) {
  const id = formData.get("id")?.toString();
  const status = formData.get("status")?.toString();

  if (!id || (status !== "confirmed" && status !== "rejected")) {
    throw new Error("Invalid conversion status update");
  }

  const user = await requireUser();
  const [conversion] = await db
    .select({ id: affiliateConversions.id })
    .from(affiliateConversions)
    .innerJoin(
      campaignCreators,
      eq(affiliateConversions.campaignCreatorId, campaignCreators.id)
    )
    .innerJoin(campaigns, eq(campaignCreators.campaignId, campaigns.id))
    .innerJoin(brands, eq(campaigns.brandId, brands.id))
    .where(
      and(
        eq(affiliateConversions.id, id),
        eq(affiliateConversions.status, "pending"),
        eq(brands.userId, user.id)
      )
    )
    .limit(1);

  if (!conversion) {
    throw new Error("Conversion not found");
  }

  await db
    .update(affiliateConversions)
    .set({ status })
    .where(
      and(
        eq(affiliateConversions.id, id),
        eq(affiliateConversions.status, "pending")
      )
    );

  revalidatePath("/analytics");
}

export async function getCreatorStats(campaignCreatorId: string) {
  await requireOwnedCampaignCreator(campaignCreatorId);

  // Get basic info
  const [info] = await db
    .select({
      creatorName: creators.name,
      brandName: brands.name,
      campaignName: campaigns.name,
      affiliateCode: campaignCreators.affiliateCode,
      affiliateRate: campaignCreators.affiliateRate,
    })
    .from(campaignCreators)
    .innerJoin(brandCreators, eq(campaignCreators.brandCreatorId, brandCreators.id))
    .innerJoin(creators, eq(brandCreators.creatorId, creators.id))
    .innerJoin(brands, eq(brandCreators.brandId, brands.id))
    .innerJoin(campaigns, eq(campaignCreators.campaignId, campaigns.id))
    .where(eq(campaignCreators.id, campaignCreatorId))
    .limit(1);

  // Get confirmed conversion stats
  const [convStats] = await db
    .select({
      conversions: count(),
      revenue: sql<number>`COALESCE(SUM(CAST(${affiliateConversions.orderValue} AS DECIMAL)), 0)`,
      commission: sql<number>`COALESCE(SUM(CAST(${affiliateConversions.commission} AS DECIMAL)), 0)`,
    })
    .from(affiliateConversions)
    .where(
      and(
        eq(affiliateConversions.campaignCreatorId, campaignCreatorId),
        eq(affiliateConversions.status, "confirmed")
      )
    );

  // Get click stats
  const [clickStats] = await db
    .select({ clicks: count() })
    .from(affiliateClicks)
    .where(eq(affiliateClicks.campaignCreatorId, campaignCreatorId));

  // Get recent conversions
  const recentConversions = await db
    .select()
    .from(affiliateConversions)
    .where(eq(affiliateConversions.campaignCreatorId, campaignCreatorId))
    .orderBy(desc(affiliateConversions.convertedAt))
    .limit(10);

  return {
    info,
    stats: {
      conversions: convStats?.conversions || 0,
      revenue: Number(convStats?.revenue || 0),
      commission: Number(convStats?.commission || 0),
      clicks: clickStats?.clicks || 0,
      conversionRate: clickStats?.clicks 
        ? ((convStats?.conversions || 0) / clickStats.clicks) * 100 
        : 0,
    },
    recentConversions,
  };
}
