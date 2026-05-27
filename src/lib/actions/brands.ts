"use server";

import { db } from "@/lib/db";
import {
  brands,
  brandCreators,
  brandCommerceIntegrations,
  type BrandAnalysis,
} from "@/lib/db/schema";
import { requireOwnedBrand, requireUser } from "@/lib/auth/access";
import { and, eq, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { analyzeBrand } from "@/lib/ai/analyze-brand";
import { matchCreators } from "@/lib/ai/match-creators";
import type { CreatorForMatching, CreatorMatchResult } from "@/lib/ai/match-creators";
import { discoverCreators, type DiscoveredCreator } from "@/lib/ai/discover-external";
import { filterNewToBrandByIdentity, getBrandProcessedIdentitySet } from "@/lib/utils/brand-creator-dedupe";
import { encryptSecret } from "@/lib/security/encryption";

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

export type ShopifyIntegrationStatus = "not_connected" | "connected" | "missing_credentials";

export type ShopifyIntegrationSettings = {
  id: string | null;
  shopDomain: string | null;
  status: ShopifyIntegrationStatus;
  hasAccessToken: boolean;
  hasWebhookSecret: boolean;
  updatedAt: Date | null;
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

export async function getShopifyIntegrationSettings(
  brandId: string
): Promise<ShopifyIntegrationSettings> {
  await requireOwnedBrand(brandId);

  const [integration] = await db
    .select({
      id: brandCommerceIntegrations.id,
      shopDomain: brandCommerceIntegrations.shopDomain,
      accessTokenEncrypted: brandCommerceIntegrations.accessTokenEncrypted,
      webhookSecretEncrypted: brandCommerceIntegrations.webhookSecretEncrypted,
      status: brandCommerceIntegrations.status,
      updatedAt: brandCommerceIntegrations.updatedAt,
    })
    .from(brandCommerceIntegrations)
    .where(
      and(
        eq(brandCommerceIntegrations.brandId, brandId),
        eq(brandCommerceIntegrations.provider, "shopify")
      )
    )
    .limit(1);

  if (!integration) {
    return {
      id: null,
      shopDomain: null,
      status: "not_connected",
      hasAccessToken: false,
      hasWebhookSecret: false,
      updatedAt: null,
    };
  }

  return {
    id: integration.id,
    shopDomain: integration.shopDomain,
    status: toShopifyIntegrationStatus(integration.status),
    hasAccessToken: Boolean(integration.accessTokenEncrypted),
    hasWebhookSecret: Boolean(integration.webhookSecretEncrypted),
    updatedAt: integration.updatedAt,
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

export async function updateShopifyIntegrationSettings(formData: FormData) {
  const brandId = formData.get("brandId")?.toString();
  const rawShopDomain = formData.get("shopDomain")?.toString() || "";
  const rawAccessToken = formData.get("accessToken")?.toString() || "";
  const rawWebhookSecret = formData.get("webhookSecret")?.toString() || "";

  if (!brandId) {
    throw new Error("Brand is required.");
  }

  await requireOwnedBrand(brandId);

  const shopDomain = normalizeShopifyShopDomain(rawShopDomain);
  const accessToken = rawAccessToken.trim();
  const webhookSecret = rawWebhookSecret.trim();

  const [existing] = await db
    .select()
    .from(brandCommerceIntegrations)
    .where(
      and(
        eq(brandCommerceIntegrations.brandId, brandId),
        eq(brandCommerceIntegrations.provider, "shopify")
      )
    )
    .limit(1);

  const accessTokenEncrypted = accessToken
    ? encryptSecret(accessToken)
    : existing?.accessTokenEncrypted ?? null;
  const webhookSecretEncrypted = webhookSecret
    ? encryptSecret(webhookSecret)
    : existing?.webhookSecretEncrypted ?? null;
  const status = getShopifyConnectionStatus({
    shopDomain,
    accessTokenEncrypted,
    webhookSecretEncrypted,
  });
  const now = new Date();

  if (existing) {
    await db
      .update(brandCommerceIntegrations)
      .set({
        shopDomain,
        accessTokenEncrypted,
        webhookSecretEncrypted,
        status,
        updatedAt: now,
      })
      .where(eq(brandCommerceIntegrations.id, existing.id));
  } else {
    await db.insert(brandCommerceIntegrations).values({
      brandId,
      provider: "shopify",
      shopDomain,
      accessTokenEncrypted,
      webhookSecretEncrypted,
      status,
      createdAt: now,
      updatedAt: now,
    });
  }

  revalidatePath(`/brands/${brandId}/settings`);
}

function normalizeShopifyShopDomain(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  const withoutProtocol = trimmed.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const domain = withoutProtocol.split("/")[0];

  if (!domain) return null;
  if (domain.includes(".")) return domain;
  return `${domain}.myshopify.com`;
}

function getShopifyConnectionStatus(input: {
  shopDomain: string | null;
  accessTokenEncrypted: string | null;
  webhookSecretEncrypted: string | null;
}): ShopifyIntegrationStatus {
  if (!input.shopDomain && !input.accessTokenEncrypted && !input.webhookSecretEncrypted) {
    return "not_connected";
  }

  if (input.shopDomain && input.accessTokenEncrypted && input.webhookSecretEncrypted) {
    return "connected";
  }

  return "missing_credentials";
}

function toShopifyIntegrationStatus(status: string): ShopifyIntegrationStatus {
  if (status === "connected" || status === "missing_credentials") return status;
  return "not_connected";
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

export type CreatorMatchDisplay = CreatorMatchResult & {
  name: string;
  source: "saved" | "discovered";
  platforms: { platformId: string; handle: string; profileUrl: string | null; followerCount: number | null }[];
  discoveredCreator?: {
    handle: string;
    platform: "instagram" | "tiktok" | "youtube" | "twitter";
    name?: string;
    followers?: string;
    niche?: string;
    location?: string;
    profileUrl?: string;
  };
};

export type MatchCreatorsResult =
  | { success: true; matches: CreatorMatchDisplay[] }
  | { success: false; error: string };

const CANDIDATE_POOL_SIZE = 200;
const MAX_CREATORS_TO_SCORE = 60;
const MIN_MATCH_SCORE = 70;

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

function addSplitTerms(terms: Set<string>, value?: string | null) {
  value
    ?.split(/[,;/|]+/)
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length >= 4)
    .forEach((term) => terms.add(term));
}

function buildDiscoverySearchTerms(analysis: BrandAnalysisForMatching, requestedTerms: string[]) {
  const terms = new Set<string>();

  requestedTerms
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length >= 4)
    .forEach((term) => terms.add(term));

  addSplitTerms(terms, analysis.niche);
  addSplitTerms(terms, analysis.idealCreatorProfile.niche);
  addSplitTerms(terms, analysis.idealCreatorProfile.contentStyle);

  const text = getBrandKeywordText(analysis);
  if (/(biohack|longevity|wellness|health optimization|functional wellness|recovery)/.test(text)) {
    [
      "health optimization creators",
      "biohacking creators",
      "longevity creators",
      "functional wellness creators",
      "wellness educators",
      "supplement reviewers",
      "recovery creators",
      "performance wellness creators",
    ].forEach((term) => terms.add(term));
  }

  if (/(food|snack|breakfast|flavo[u]?r|taste|dessert|recipe)/.test(text)) {
    FOOD_RELEVANCE_TERMS.map((term) => `${term} creators`).forEach((term) => terms.add(term));
  }

  return Array.from(terms).slice(0, 18);
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
 * Score creators already linked to this brand against the brand's analysis.
 */
export async function matchCreatorsAction(brandId: string, limit = 10): Promise<MatchCreatorsResult> {
  limit = Math.min(limit, 200);
  const brand = await getBrandById(brandId);

  if (!brand) return { success: false, error: "Brand not found." };
  if (!brand.brandAnalysis)
    return { success: false, error: "Run brand analysis first." };

  const { creators, brandCreators: brandCreatorsTable } = await import("@/lib/db/schema");
  const { inArray } = await import("drizzle-orm");

  const linked = await db
    .select({ creatorId: brandCreatorsTable.creatorId })
    .from(brandCreatorsTable)
    .where(eq(brandCreatorsTable.brandId, brandId));

  const linkedIds = linked.map((r) => r.creatorId);
  if (linkedIds.length === 0) {
    return { success: true, matches: [] };
  }

  const savedCreators = await db.query.creators.findMany({
    where: inArray(creators.id, linkedIds),
    with: { platforms: true },
    limit: CANDIDATE_POOL_SIZE,
  });

  const relevanceKeywords = buildRelevanceKeywords(brand.brandAnalysis);
  const relevantCandidates = savedCreators
    .map((creator) => scoreCreatorRelevance(creator, relevanceKeywords))
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

  const creatorMap = new Map(relevantCandidates.map((c) => [c.id, c]));
  const enriched = results
    .filter((r) => r.fitScore >= MIN_MATCH_SCORE)
    .slice(0, limit)
    .map((r) => {
      const creator = creatorMap.get(r.creatorId);
      return {
        ...r,
        source: "saved" as const,
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

function parseFollowerCount(str?: string) {
  if (!str) return null;
  const match = str.match(/(\d+\.?\d*)([KMB])?/i);
  if (!match) return null;

  let num = parseFloat(match[1]);
  const suffix = match[2]?.toUpperCase();
  if (suffix === "K") num *= 1000;
  else if (suffix === "M") num *= 1000000;
  else if (suffix === "B") num *= 1000000000;

  return Math.round(num);
}

function discoveredCreatorId(creator: DiscoveredCreator) {
  return `discovered:${creator.platform}:${creator.handle.toLowerCase()}`;
}

function toCreatorForMatching(creator: DiscoveredCreator): CreatorForMatching {
  return {
    id: discoveredCreatorId(creator),
    name: creator.name || creator.handle,
    bio: [creator.bio, creator.niche].filter(Boolean).join(" — ") || null,
    country: creator.location || null,
    platforms: [{
      platformId: creator.platform,
      handle: creator.handle,
      profileUrl: creator.profileUrl,
      followerCount: parseFollowerCount(creator.followers),
      engagementRate: null,
    }],
  };
}

export async function discoverAndScoreCreatorsAction(
  brandId: string,
  searchTerms: string[],
  limit = 10
): Promise<MatchCreatorsResult> {
  limit = Math.min(limit, 25);
  const brand = await getBrandById(brandId);

  if (!brand) return { success: false, error: "Brand not found." };
  if (!brand.brandAnalysis)
    return { success: false, error: "Run brand analysis first." };

  const discoveryTerms = buildDiscoverySearchTerms(brand.brandAnalysis, searchTerms);
  const keywords = discoveryTerms.join(", ") || [
    brand.brandAnalysis.niche,
    brand.brandAnalysis.idealCreatorProfile.niche,
    brand.brandAnalysis.idealCreatorProfile.contentStyle,
  ].filter(Boolean).join(", ");
  const discoveryPoolSize = Math.min(Math.max(limit * 5, 45), 75);

  let discovered: DiscoveredCreator[];
  try {
    discovered = await discoverCreators({
      keywords,
      platform: "all",
      limit: discoveryPoolSize,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Discovery failed";
    return { success: false, error: message };
  }

  if (discovered.length === 0) {
    return { success: true, matches: [] };
  }

  const brandIdentities = await getBrandProcessedIdentitySet(brandId);
  const newDiscovered = filterNewToBrandByIdentity(brandIdentities, discovered);

  if (newDiscovered.length === 0) {
    return { success: true, matches: [] };
  }

  const candidates = newDiscovered
    .slice(0, Math.min(newDiscovered.length, 80))
    .map(toCreatorForMatching);
  let results: CreatorMatchResult[];
  try {
    results = await matchCreators(brand.brandAnalysis, candidates);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }

  const creatorMap = new Map(newDiscovered.map((creator) => [discoveredCreatorId(creator), creator]));
  const enriched = results
    .filter((r) => r.fitScore >= MIN_MATCH_SCORE)
    .slice(0, limit)
    .map((r) => {
      const creator = creatorMap.get(r.creatorId);
      return {
        ...r,
        source: "discovered" as const,
        name: creator?.name || creator?.handle || "Unknown",
        platforms: creator ? [{
          platformId: creator.platform,
          handle: creator.handle,
          profileUrl: creator.profileUrl || null,
          followerCount: parseFollowerCount(creator.followers),
        }] : [],
        discoveredCreator: creator ? {
          handle: creator.handle,
          platform: creator.platform,
          name: creator.name,
          followers: creator.followers,
          niche: creator.niche,
          location: creator.location,
          profileUrl: creator.profileUrl,
        } : undefined,
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
  revalidatePath(`/brands/${brandId}/leads`);
  revalidatePath(`/brands/${brandId}/send-dms`);
  return newBrandCreator;
}
