"use server";

import { db } from "@/lib/db";
import { 
  brandCreators, 
  brands, 
  creators, 
  campaigns,
  outreaches,
  contents,
  campaignCreators,
} from "@/lib/db/schema";
import { eq, sql, and, gte, lte, count, desc } from "drizzle-orm";

export async function getDashboardStats() {
  // Get overall counts
  const [
    creatorCount,
    brandCount,
    campaignCount,
    leadCount,
  ] = await Promise.all([
    db.select({ count: count() }).from(creators),
    db.select({ count: count() }).from(brands),
    db.select({ count: count() }).from(campaigns).where(
      sql`${campaigns.status} IN ('active', 'recruiting')`
    ),
    db.select({ count: count() }).from(brandCreators),
  ]);

  return {
    creators: creatorCount[0]?.count || 0,
    brands: brandCount[0]?.count || 0,
    activeCampaigns: campaignCount[0]?.count || 0,
    totalLeads: leadCount[0]?.count || 0,
  };
}

export async function getLeadFunnelStats() {
  // Get counts by status for all brands
  const statusCounts = await db
    .select({
      status: brandCreators.status,
      count: count(),
    })
    .from(brandCreators)
    .groupBy(brandCreators.status);

  const funnel: Record<string, number> = {};
  for (const row of statusCounts) {
    funnel[row.status] = row.count;
  }

  return funnel;
}

export async function getOutreachStats() {
  // Get outreach counts by status
  const stats = await db
    .select({
      status: outreaches.status,
      count: count(),
    })
    .from(outreaches)
    .groupBy(outreaches.status);

  const result: Record<string, number> = {};
  for (const row of stats) {
    result[row.status] = row.count;
  }

  // Calculate rates
  const sent = result.sent || 0;
  const replied = result.replied || 0;
  const opened = result.opened || 0;

  return {
    ...result,
    total: Object.values(result).reduce((a, b) => a + b, 0),
    replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
    openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
  };
}

export async function getTodaysTasks() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get leads ready to contact (discovered status)
  const toContact = await db
    .select({
      id: brandCreators.id,
      status: brandCreators.status,
      brandId: brandCreators.brandId,
      brandName: brands.name,
      creatorId: brandCreators.creatorId,
      creatorName: creators.name,
    })
    .from(brandCreators)
    .innerJoin(brands, eq(brandCreators.brandId, brands.id))
    .innerJoin(creators, eq(brandCreators.creatorId, creators.id))
    .where(eq(brandCreators.status, "discovered"))
    .limit(10);

  // Get follow-ups due (contacted 3+ days ago with no response)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const followUps = await db
    .select({
      id: brandCreators.id,
      status: brandCreators.status,
      brandId: brandCreators.brandId,
      brandName: brands.name,
      creatorId: brandCreators.creatorId,
      creatorName: creators.name,
      lastContactedAt: brandCreators.lastContactedAt,
    })
    .from(brandCreators)
    .innerJoin(brands, eq(brandCreators.brandId, brands.id))
    .innerJoin(creators, eq(brandCreators.creatorId, creators.id))
    .where(
      and(
        eq(brandCreators.status, "contacted"),
        lte(brandCreators.lastContactedAt, threeDaysAgo)
      )
    )
    .limit(10);

  return {
    toContact,
    followUps,
  };
}

export async function getRecentActivity() {
  // Get recent brand-creator status changes
  const recentLeads = await db
    .select({
      id: brandCreators.id,
      status: brandCreators.status,
      brandName: brands.name,
      creatorName: creators.name,
      updatedAt: brandCreators.updatedAt,
    })
    .from(brandCreators)
    .innerJoin(brands, eq(brandCreators.brandId, brands.id))
    .innerJoin(creators, eq(brandCreators.creatorId, creators.id))
    .orderBy(desc(brandCreators.updatedAt))
    .limit(10);

  // Get recent content submissions
  const recentContent = await db
    .select({
      id: contents.id,
      status: contents.status,
      type: contents.type,
      createdAt: contents.createdAt,
    })
    .from(contents)
    .orderBy(desc(contents.createdAt))
    .limit(5);

  return {
    recentLeads,
    recentContent,
  };
}

export async function getBrandPerformance() {
  // Get performance metrics per brand
  const brandStats = await db
    .select({
      brandId: brands.id,
      brandName: brands.name,
      totalLeads: count(brandCreators.id),
    })
    .from(brands)
    .leftJoin(brandCreators, eq(brands.id, brandCreators.brandId))
    .groupBy(brands.id, brands.name)
    .orderBy(desc(count(brandCreators.id)))
    .limit(5);

  return brandStats;
}
