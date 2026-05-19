"use server";

import { db } from "@/lib/db";
import { campaigns, campaignCreators, brands } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/access";
import { and, eq, count, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// =============================================================================
// TYPES
// =============================================================================
export type CampaignStatus =
  | "draft"
  | "approved"
  | "recruiting"
  | "active"
  | "completed"
  | "archived";

export type CreateCampaignInput = {
  brandId: string;
  name: string;
  description?: string;
  objective?: "awareness" | "engagement" | "conversions" | "content" | "other";
  startDate?: string;
  endDate?: string;
  budget?: number;
  currency?: string;
  targetCreatorCount?: number;
};

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get all campaigns, optionally filtered by brand
 */
export async function getCampaigns(brandId?: string) {
  const user = await requireUser();
  const whereClause = brandId
    ? and(eq(campaigns.brandId, brandId), eq(brands.userId, user.id))
    : eq(brands.userId, user.id);

  const result = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      description: campaigns.description,
      status: campaigns.status,
      startDate: campaigns.startDate,
      endDate: campaigns.endDate,
      budget: campaigns.budget,
      currency: campaigns.currency,
      createdAt: campaigns.createdAt,
      brand: {
        id: brands.id,
        name: brands.name,
        logoUrl: brands.logoUrl,
      },
      creatorCount: count(campaignCreators.id),
    })
    .from(campaigns)
    .leftJoin(brands, eq(campaigns.brandId, brands.id))
    .leftJoin(campaignCreators, eq(campaigns.id, campaignCreators.campaignId))
    .where(whereClause)
    .groupBy(campaigns.id, brands.id)
    .orderBy(desc(campaigns.createdAt));

  return result;
}

/**
 * Get a single campaign by ID with creator counts per status
 */
export async function getCampaignById(id: string) {
  const user = await requireUser();

  const [campaign] = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      description: campaigns.description,
      objective: campaigns.objective,
      status: campaigns.status,
      startDate: campaigns.startDate,
      endDate: campaigns.endDate,
      budget: campaigns.budget,
      currency: campaigns.currency,
      targetCreatorCount: campaigns.targetCreatorCount,
      createdAt: campaigns.createdAt,
      updatedAt: campaigns.updatedAt,
      brand: {
        id: brands.id,
        name: brands.name,
        logoUrl: brands.logoUrl,
      },
    })
    .from(campaigns)
    .leftJoin(brands, eq(campaigns.brandId, brands.id))
    .where(and(eq(campaigns.id, id), eq(brands.userId, user.id)));

  if (!campaign) return null;

  // Get creator counts by status
  const creatorStats = await db
    .select({
      status: campaignCreators.status,
      count: count(),
    })
    .from(campaignCreators)
    .where(eq(campaignCreators.campaignId, id))
    .groupBy(campaignCreators.status);

  const statusCounts: Record<string, number> = {};
  for (const stat of creatorStats) {
    statusCounts[stat.status] = stat.count;
  }

  const totalCreators = Object.values(statusCounts).reduce(
    (sum, c) => sum + c,
    0
  );

  return {
    ...campaign,
    statusCounts,
    totalCreators,
  };
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new campaign
 */
export async function createCampaign(input: CreateCampaignInput) {
  const user = await requireUser();

  const [brand] = await db
    .select({ id: brands.id })
    .from(brands)
    .where(and(eq(brands.id, input.brandId), eq(brands.userId, user.id)))
    .limit(1);

  if (!brand) {
    throw new Error("Brand not found");
  }

  const [newCampaign] = await db
    .insert(campaigns)
    .values({
      brandId: input.brandId,
      name: input.name,
      description: input.description || null,
      objective: input.objective || null,
      startDate: input.startDate || null,
      endDate: input.endDate || null,
      budget: input.budget?.toString() || null,
      currency: input.currency || "USD",
      targetCreatorCount: input.targetCreatorCount || null,
      status: "draft",
    })
    .returning();

  revalidatePath("/campaigns");
  revalidatePath(`/brands/${input.brandId}`);

  return newCampaign;
}

/**
 * Update campaign status
 */
export async function updateCampaignStatus(id: string, status: CampaignStatus) {
  const campaign = await getCampaignById(id);

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const [updated] = await db
    .update(campaigns)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, id))
    .returning();

  revalidatePath(`/campaigns/${id}`);
  revalidatePath("/campaigns");

  return updated;
}
