"use server";

import { db } from "@/lib/db";
import { brands, brandCreators } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { analyzeBrand } from "@/lib/ai/analyze-brand";
import { matchCreators } from "@/lib/ai/match-creators";
import type { CreatorMatchResult } from "@/lib/ai/match-creators";

// =============================================================================
// TYPES
// =============================================================================
export type CreateBrandInput = {
  name: string;
  website?: string;
  industry?: string;
  logoUrl?: string;
  billingEmail?: string;
};

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get all brands with creator count
 */
export async function getBrands() {
  const result = await db
    .select({
      id: brands.id,
      name: brands.name,
      logoUrl: brands.logoUrl,
      website: brands.website,
      industry: brands.industry,
      createdAt: brands.createdAt,
      creatorCount: count(brandCreators.id),
    })
    .from(brands)
    .leftJoin(brandCreators, eq(brands.id, brandCreators.brandId))
    .groupBy(brands.id)
    .orderBy(brands.createdAt);

  return result;
}

/**
 * Get a single brand by ID with creator count
 */
export async function getBrandById(id: string) {
  const [brand] = await db
    .select({
      id: brands.id,
      name: brands.name,
      logoUrl: brands.logoUrl,
      website: brands.website,
      industry: brands.industry,
      billingEmail: brands.billingEmail,
      brandAnalysis: brands.brandAnalysis,
      analyzedAt: brands.analyzedAt,
      createdAt: brands.createdAt,
      updatedAt: brands.updatedAt,
    })
    .from(brands)
    .where(eq(brands.id, id));

  if (!brand) return null;

  // Get creator count separately
  const [countResult] = await db
    .select({ count: count() })
    .from(brandCreators)
    .where(eq(brandCreators.brandId, id));

  return {
    ...brand,
    creatorCount: countResult?.count || 0,
  };
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new brand
 */
export async function createBrand(input: CreateBrandInput) {
  const [newBrand] = await db
    .insert(brands)
    .values({
      name: input.name,
      website: input.website || null,
      industry: input.industry || null,
      logoUrl: input.logoUrl || null,
      billingEmail: input.billingEmail || null,
    })
    .returning();

  revalidatePath("/brands");

  return newBrand;
}

// =============================================================================
// AI ACTIONS
// =============================================================================

export type AnalyzeBrandResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Fetch and analyze a brand's website using Claude, then store the result.
 */
export async function analyzeBrandAction(
  brandId: string
): Promise<AnalyzeBrandResult> {
  const brand = await getBrandById(brandId);

  if (!brand) return { success: false, error: "Brand not found." };
  if (!brand.website)
    return { success: false, error: "Brand has no website URL." };

  let analysis;
  try {
    analysis = await analyzeBrand(brand.website);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }

  await db
    .update(brands)
    .set({ brandAnalysis: analysis, analyzedAt: new Date() })
    .where(eq(brands.id, brandId));

  revalidatePath(`/brands/${brandId}`);
  return { success: true };
}

export type MatchCreatorsResult =
  | { success: true; matches: (CreatorMatchResult & { name: string; platforms: { platformId: string; followerCount: number | null }[] })[] }
  | { success: false; error: string };

/**
 * Score all unlinked creators against the brand's analysis.
 */
export async function matchCreatorsAction(brandId: string, limit = 10): Promise<MatchCreatorsResult> {
  limit = Math.min(limit, 200);
  const brand = await getBrandById(brandId);

  if (!brand) return { success: false, error: "Brand not found." };
  if (!brand.brandAnalysis)
    return { success: false, error: "Run brand analysis first." };

  // Get creators not yet linked to this brand
  const { creators, creatorPlatforms, brandCreators: brandCreatorsTable } = await import("@/lib/db/schema");
  const { notInArray, sql } = await import("drizzle-orm");

  // IDs already linked
  const linked = await db
    .select({ creatorId: brandCreatorsTable.creatorId })
    .from(brandCreatorsTable)
    .where(eq(brandCreatorsTable.brandId, brandId));

  const linkedIds = linked.map((r) => r.creatorId);

  // Fetch unlinked creators up to the requested limit
  const allCreators = await db.query.creators.findMany({
    where: linkedIds.length > 0 ? notInArray(creators.id, linkedIds) : undefined,
    with: { platforms: true },
    limit,
  });

  if (allCreators.length === 0)
    return { success: false, error: "No unlinked creators to match." };

  let results: CreatorMatchResult[];
  try {
    results = await matchCreators(brand.brandAnalysis, allCreators);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }

  // Enrich results with name + platforms for display
  const creatorMap = new Map(allCreators.map((c) => [c.id, c]));
  const enriched = results.map((r) => {
    const creator = creatorMap.get(r.creatorId);
    return {
      ...r,
      name: creator?.name ?? "Unknown",
      platforms: creator?.platforms.map((p) => ({
        platformId: p.platformId,
        followerCount: p.followerCount,
      })) ?? [],
    };
  });

  return { success: true, matches: enriched };
}

/**
 * Add a creator to a brand with an optional fit score (used from match results).
 */
export async function addCreatorToBrandWithScore(
  brandId: string,
  creatorId: string,
  fitScore?: number
) {
  const { brandCreators: brandCreatorsTable } = await import("@/lib/db/schema");
  const { and } = await import("drizzle-orm");

  const existing = await db.query.brandCreators.findFirst({
    where: and(
      eq(brandCreatorsTable.brandId, brandId),
      eq(brandCreatorsTable.creatorId, creatorId)
    ),
  });

  if (existing) throw new Error("Creator already linked to this brand.");

  const [newBrandCreator] = await db
    .insert(brandCreatorsTable)
    .values({
      brandId,
      creatorId,
      status: "discovered",
      source: "ai_match",
      fitScore: fitScore ?? null,
    })
    .returning();

  revalidatePath(`/brands/${brandId}`);
  return newBrandCreator;
}
