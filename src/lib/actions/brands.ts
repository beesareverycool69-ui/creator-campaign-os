"use server";

import { db } from "@/lib/db";
import { brands, brandCreators, type BrandAnalysis } from "@/lib/db/schema";
import { requireOwnedBrand, requireUser } from "@/lib/auth/access";
import { and, eq, count } from "drizzle-orm";
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
  const user = await requireUser();

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
    .where(eq(brands.userId, user.id))
    .groupBy(brands.id)
    .orderBy(brands.createdAt);

  return result;
}

/**
 * Get a single brand by ID with creator count
 */
export async function getBrandById(id: string) {
  const user = await requireUser();

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
    .where(and(eq(brands.id, id), eq(brands.userId, user.id)));

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
  const user = await requireUser();

  const [newBrand] = await db
    .insert(brands)
    .values({
      userId: user.id,
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
  | { success: true; matches: (CreatorMatchResult & { name: string; platforms: { platformId: string; handle: string; profileUrl: string | null; followerCount: number | null }[] })[] }
  | { success: false; error: string };

const CANDIDATE_POOL_SIZE = 200;
const MAX_CREATORS_TO_SCORE = 60;
const MIN_MATCH_SCORE = 50;

const GENERIC_STOP_WORDS = new Set([
  "and",
  "are",
  "but",
  "for",
  "from",
  "have",
  "into",
  "not",
  "that",
  "the",
  "their",
  "this",
  "with",
  "would",
]);

const FOOD_RELEVANCE_TERMS = [
  "food",
  "snack",
  "snacks",
  "snacking",
  "breakfast",
  "taste test",
  "taste tests",
  "flavor",
  "flavour",
  "flavor review",
  "flavor reviews",
  "food comedy",
  "new snack",
  "recipe",
  "recipes",
  "dessert",
  "convenience food",
  "food hack",
  "food hacks",
];

const OBVIOUS_NON_FIT_TERMS = [
  "fitness",
  "supplement",
  "supplements",
  "skincare",
  "selfcare",
  "self-care",
  "gym",
];

type BrandAnalysisForMatching = BrandAnalysis;
type CreatorCandidate = Awaited<ReturnType<typeof db.query.creators.findMany>>[number] & {
  platforms: { platformId: string; handle: string; profileUrl: string | null; followerCount: number | null; engagementRate: string | null }[];
};

function getBrandKeywordText(analysis: BrandAnalysisForMatching) {
  return [
    analysis.niche,
    analysis.targetAudience,
    analysis.toneOfVoice,
    analysis.idealCreatorProfile.niche,
    analysis.idealCreatorProfile.contentStyle,
    analysis.summary,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildRelevanceKeywords(analysis: BrandAnalysisForMatching) {
  const text = getBrandKeywordText(analysis);
  const keywords = new Set<string>();

  for (const phrase of [
    analysis.niche,
    analysis.targetAudience,
    analysis.toneOfVoice,
    analysis.idealCreatorProfile.niche,
    analysis.idealCreatorProfile.contentStyle,
  ]) {
    phrase
      ?.toLowerCase()
      .split(/[^a-z0-9+.-]+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 4 && !GENERIC_STOP_WORDS.has(word))
      .forEach((word) => keywords.add(word));
  }

  [analysis.idealCreatorProfile.niche, analysis.idealCreatorProfile.contentStyle]
    .join(",")
    .toLowerCase()
    .split(/[,;]+/)
    .map((phrase) => phrase.trim())
    .filter((phrase) => phrase.length >= 4)
    .forEach((phrase) => keywords.add(phrase));

  if (/(food|snack|breakfast|flavo[u]?r|taste|dessert|recipe)/.test(text)) {
    FOOD_RELEVANCE_TERMS.forEach((term) => keywords.add(term));
  }

  return Array.from(keywords);
}

function scoreCreatorRelevance(creator: CreatorCandidate, keywords: string[]) {
  const creatorText = [
    creator.name,
    creator.bio,
    creator.country,
    creator.city,
    creator.primaryPlatform,
    creator.tier,
    ...creator.platforms.flatMap((p) => [p.platformId, p.handle]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const positiveMatches = keywords.filter((keyword) => creatorText.includes(keyword));
  const nonFitMatches = OBVIOUS_NON_FIT_TERMS.filter((term) => creatorText.includes(term));
  const hasPositiveMatch = positiveMatches.length > 0;

  return {
    creator,
    score: positiveMatches.length * 3 - (hasPositiveMatch ? 0 : nonFitMatches.length * 4),
    positiveMatches: positiveMatches.length,
  };
}

/**
 * Score brand-relevant unlinked creators against the brand's analysis.
 */
export async function matchCreatorsAction(brandId: string, limit = 10): Promise<MatchCreatorsResult> {
  limit = Math.min(limit, 200);
  const brand = await getBrandById(brandId);

  if (!brand) return { success: false, error: "Brand not found." };
  if (!brand.brandAnalysis)
    return { success: false, error: "Run brand analysis first." };

  // Get creators not yet linked to this brand
  const { creators, brandCreators: brandCreatorsTable } = await import("@/lib/db/schema");
  const { notInArray } = await import("drizzle-orm");

  // IDs already linked
  const linked = await db
    .select({ creatorId: brandCreatorsTable.creatorId })
    .from(brandCreatorsTable)
    .where(eq(brandCreatorsTable.brandId, brandId));

  const linkedIds = linked.map((r) => r.creatorId);

  // Fetch a broader unlinked pool, then score only the most brand-relevant candidates.
  const candidatePool = await db.query.creators.findMany({
    where: linkedIds.length > 0 ? notInArray(creators.id, linkedIds) : undefined,
    with: { platforms: true },
    limit: CANDIDATE_POOL_SIZE,
  });

  if (candidatePool.length === 0)
    return { success: false, error: "No unlinked creators to match." };

  const relevanceKeywords = buildRelevanceKeywords(brand.brandAnalysis);
  const relevantCandidates = candidatePool
    .map((creator) => scoreCreatorRelevance(creator, relevanceKeywords))
    .filter((candidate) => candidate.positiveMatches > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(MAX_CREATORS_TO_SCORE, Math.max(limit * 4, limit)))
    .map((candidate) => candidate.creator);

  if (relevantCandidates.length === 0) {
    return { success: true, matches: [] };
  }

  let results: CreatorMatchResult[];
  try {
    results = await matchCreators(brand.brandAnalysis, relevantCandidates);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }

  // Enrich qualified results with name + platforms for display.
  const creatorMap = new Map(relevantCandidates.map((c) => [c.id, c]));
  const enriched = results
    .filter((r) => r.fitScore >= MIN_MATCH_SCORE)
    .slice(0, limit)
    .map((r) => {
      const creator = creatorMap.get(r.creatorId);
      return {
        ...r,
        name: creator?.name ?? "Unknown",
        platforms: creator?.platforms.map((p) => ({
          platformId: p.platformId,
          handle: p.handle,
          profileUrl: p.profileUrl,
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
  await requireOwnedBrand(brandId);

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
