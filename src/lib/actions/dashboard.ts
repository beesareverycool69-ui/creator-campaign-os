"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/access";
import { 
  brandCreators, 
  brands, 
  creators, 
  campaigns,
  outreaches,
  contents,
  campaignCreators,
  products,
} from "@/lib/db/schema";
import { eq, sql, and, lte, count, desc, inArray } from "drizzle-orm";

export async function getDashboardStats() {
  const user = await requireUser();

  // Get overall counts
  const creatorCount = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${brandCreators.creatorId})` })
    .from(brandCreators)
    .innerJoin(brands, eq(brandCreators.brandId, brands.id))
    .where(eq(brands.userId, user.id));
  const brandCount = await db
    .select({ count: count() })
    .from(brands)
    .where(eq(brands.userId, user.id));
  const campaignCount = await db
    .select({ count: count() })
    .from(campaigns)
    .innerJoin(brands, eq(campaigns.brandId, brands.id))
    .where(
      and(
        eq(brands.userId, user.id),
        sql`${campaigns.status} IN ('active', 'recruiting')`
      )
    );
  const leadCount = await db
    .select({ count: count() })
    .from(brandCreators)
    .innerJoin(brands, eq(brandCreators.brandId, brands.id))
    .where(eq(brands.userId, user.id));

  return {
    creators: creatorCount[0]?.count || 0,
    brands: brandCount[0]?.count || 0,
    activeCampaigns: campaignCount[0]?.count || 0,
    totalLeads: leadCount[0]?.count || 0,
  };
}

export async function getLeadFunnelStats() {
  const user = await requireUser();

  // Get counts by status for all brands
  const statusCounts = await db
    .select({
      status: brandCreators.status,
      count: count(),
    })
    .from(brandCreators)
    .innerJoin(brands, eq(brandCreators.brandId, brands.id))
    .where(eq(brands.userId, user.id))
    .groupBy(brandCreators.status);

  const funnel: Record<string, number> = {};
  for (const row of statusCounts) {
    funnel[row.status] = row.count;
  }

  return funnel;
}

export async function getOutreachStats() {
  const user = await requireUser();

  // Get outreach counts by status
  const stats = await db
    .select({
      status: outreaches.status,
      count: count(),
    })
    .from(outreaches)
    .innerJoin(brandCreators, eq(outreaches.brandCreatorId, brandCreators.id))
    .innerJoin(brands, eq(brandCreators.brandId, brands.id))
    .where(eq(brands.userId, user.id))
    .groupBy(outreaches.status);

  const result: Record<string, number> = {};
  for (const row of stats) {
    result[row.status] = row.count;
  }

  // Calculate rates
  const sent = result.sent || 0;
  const replied = result.replied || 0;
  const opened = result.opened || 0;

  const sentOutreachTotal = [
    "sent",
    "delivered",
    "opened",
    "clicked",
    "replied",
    "no_response",
  ].reduce((total, status) => total + (result[status] || 0), 0);

  return {
    ...result,
    total: Object.values(result).reduce((a, b) => a + b, 0),
    sentOutreachTotal,
    repliedCount: replied,
    hasSentOutreach: sentOutreachTotal > 0,
    replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
    openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
  };
}

export async function getTodaysTasks() {
  const user = await requireUser();

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
    .where(
      and(eq(brandCreators.status, "discovered"), eq(brands.userId, user.id))
    )
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
        eq(brands.userId, user.id),
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
  const user = await requireUser();

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
    .where(eq(brands.userId, user.id))
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
    .innerJoin(campaignCreators, eq(contents.campaignCreatorId, campaignCreators.id))
    .innerJoin(campaigns, eq(campaignCreators.campaignId, campaigns.id))
    .innerJoin(brands, eq(campaigns.brandId, brands.id))
    .where(eq(brands.userId, user.id))
    .orderBy(desc(contents.createdAt))
    .limit(5);

  return {
    recentLeads,
    recentContent,
  };
}

export async function getSetupProgress() {
  const user = await requireUser();

  const firstBrand = await db
    .select({ id: brands.id, name: brands.name })
    .from(brands)
    .where(eq(brands.userId, user.id))
    .orderBy(desc(brands.createdAt))
    .limit(1);
  const productCount = await db
    .select({ count: count() })
    .from(products)
    .innerJoin(brands, eq(products.brandId, brands.id))
    .where(eq(brands.userId, user.id));
  const leadCount = await db
    .select({ count: count() })
    .from(brandCreators)
    .innerJoin(brands, eq(brandCreators.brandId, brands.id))
    .where(eq(brands.userId, user.id));
  const outreachCount = await db
    .select({ count: count() })
    .from(outreaches)
    .innerJoin(brandCreators, eq(outreaches.brandCreatorId, brandCreators.id))
    .innerJoin(brands, eq(brandCreators.brandId, brands.id))
    .where(eq(brands.userId, user.id));
  const campaignCount = await db
    .select({ count: count() })
    .from(campaigns)
    .innerJoin(brands, eq(campaigns.brandId, brands.id))
    .where(eq(brands.userId, user.id));

  const brand = firstBrand[0] || null;
  const [nextOutreachBrand] = await db
    .select({
      id: brands.id,
      name: brands.name,
      readyLeadCount: count(brandCreators.id),
    })
    .from(brands)
    .innerJoin(brandCreators, eq(brands.id, brandCreators.brandId))
    .where(
      and(
        eq(brands.userId, user.id),
        inArray(brandCreators.status, ["discovered", "researching", "qualified"]),
        eq(brandCreators.doNotContact, false)
      )
    )
    .groupBy(brands.id, brands.name)
    .orderBy(desc(count(brandCreators.id)))
    .limit(1);

  return {
    firstBrandId: brand?.id || null,
    firstBrandName: brand?.name || null,
    nextOutreachBrandId: nextOutreachBrand?.id || null,
    nextOutreachBrandName: nextOutreachBrand?.name || null,
    readyForOutreachCount: nextOutreachBrand?.readyLeadCount || 0,
    hasBrand: !!brand,
    hasProducts: (productCount[0]?.count || 0) > 0,
    hasCreators: (leadCount[0]?.count || 0) > 0,
    hasOutreach: (outreachCount[0]?.count || 0) > 0,
    hasCampaign: (campaignCount[0]?.count || 0) > 0,
  };
}

export async function getBrandPerformance() {
  const user = await requireUser();

  // Get performance metrics per brand
  const brandStats = await db
    .select({
      brandId: brands.id,
      brandName: brands.name,
      totalLeads: count(brandCreators.id),
    })
    .from(brands)
    .leftJoin(brandCreators, eq(brands.id, brandCreators.brandId))
    .where(eq(brands.userId, user.id))
    .groupBy(brands.id, brands.name)
    .orderBy(desc(count(brandCreators.id)))
    .limit(5);

  return brandStats;
}
