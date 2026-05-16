"use server";

import { db } from "@/lib/db";
import {
  campaignCreators,
  brandCreators,
  creators,
  creatorPlatforms,
  campaigns,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// =============================================================================
// TYPES
// =============================================================================
export type CampaignCreatorStatus =
  // Recruitment
  | "shortlisted"
  | "invited"
  | "reminded"
  | "negotiating"
  | "accepted"
  | "declined"
  | "ghosted"
  // Onboarding
  | "onboarding"
  | "ready"
  // Execution
  | "shipped"
  | "creating"
  | "in_review"
  | "revision"
  | "approved"
  | "posting"
  | "posted"
  | "completed"
  // Terminal
  | "dropped"
  | "withdrawn";

export type AddCreatorToCampaignInput = {
  campaignId: string;
  brandCreatorId: string; // Must be BrandCreator ID, not Creator ID
  rate?: number;
  rateType?: "flat" | "per_post" | "per_view" | "affiliate";
  currency?: string;
  deliverableCount?: number;
  notes?: string;
};

export type CampaignCreatorWithDetails = {
  id: string;
  status: CampaignCreatorStatus;
  rate: string | null;
  rateType: string | null;
  currency: string | null;
  deliverableCount: number | null;
  notes: string | null;
  shortlistedAt: Date | null;
  invitedAt: Date | null;
  acceptedAt: Date | null;
  readyAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  creator: {
    id: string;
    name: string;
    email: string | null;
    avatarUrl: string | null;
    country: string | null;
    tier: string | null;
  };
  platforms: {
    id: string;
    platformId: string;
    handle: string;
    followerCount: number | null;
  }[];
  brandCreator: {
    id: string;
    status: string;
    source: string | null;
  };
};

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get all creators in a campaign with their details
 */
export async function getCampaignCreators(
  campaignId: string
): Promise<CampaignCreatorWithDetails[]> {
  const result = await db.query.campaignCreators.findMany({
    where: eq(campaignCreators.campaignId, campaignId),
    with: {
      brandCreator: {
        with: {
          creator: {
            with: {
              platforms: true,
            },
          },
        },
      },
    },
    orderBy: (campaignCreators, { desc }) => [desc(campaignCreators.createdAt)],
  });

  return result.map((cc) => ({
    id: cc.id,
    status: cc.status as CampaignCreatorStatus,
    rate: cc.rate,
    rateType: cc.rateType,
    currency: cc.currency,
    deliverableCount: cc.deliverableCount,
    notes: cc.notes,
    shortlistedAt: cc.shortlistedAt,
    invitedAt: cc.invitedAt,
    acceptedAt: cc.acceptedAt,
    readyAt: cc.readyAt,
    completedAt: cc.completedAt,
    createdAt: cc.createdAt,
    updatedAt: cc.updatedAt,
    creator: {
      id: cc.brandCreator.creator.id,
      name: cc.brandCreator.creator.name,
      email: cc.brandCreator.creator.email,
      avatarUrl: cc.brandCreator.creator.avatarUrl,
      country: cc.brandCreator.creator.country,
      tier: cc.brandCreator.creator.tier,
    },
    platforms: cc.brandCreator.creator.platforms.map((p) => ({
      id: p.id,
      platformId: p.platformId,
      handle: p.handle,
      followerCount: p.followerCount,
    })),
    brandCreator: {
      id: cc.brandCreator.id,
      status: cc.brandCreator.status,
      source: cc.brandCreator.source,
    },
  }));
}

/**
 * Get a single campaign-creator by ID with all details
 */
export async function getCampaignCreatorById(id: string) {
  const result = await db.query.campaignCreators.findFirst({
    where: eq(campaignCreators.id, id),
    with: {
      campaign: {
        with: {
          brand: true,
        },
      },
      brandCreator: {
        with: {
          creator: {
            with: {
              platforms: true,
              addresses: true,
            },
          },
        },
      },
    },
  });

  return result;
}

/**
 * Get creators from a brand that are NOT yet in a specific campaign
 */
export async function getAvailableBrandCreatorsForCampaign(
  brandId: string,
  campaignId: string
) {
  // Get all brand creators for this brand
  const allBrandCreators = await db.query.brandCreators.findMany({
    where: eq(brandCreators.brandId, brandId),
    with: {
      creator: {
        with: {
          platforms: true,
        },
      },
    },
  });

  // Get brand creator IDs already in this campaign
  const existingInCampaign = await db.query.campaignCreators.findMany({
    where: eq(campaignCreators.campaignId, campaignId),
    columns: {
      brandCreatorId: true,
    },
  });

  const existingIds = new Set(existingInCampaign.map((cc) => cc.brandCreatorId));

  // Filter out those already in campaign
  return allBrandCreators
    .filter((bc) => !existingIds.has(bc.id))
    .map((bc) => ({
      id: bc.id,
      status: bc.status,
      creator: {
        id: bc.creator.id,
        name: bc.creator.name,
        email: bc.creator.email,
        avatarUrl: bc.creator.avatarUrl,
        platforms: bc.creator.platforms,
      },
    }));
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Add a creator to a campaign (creates CampaignCreator record)
 * IMPORTANT: Takes brandCreatorId, not raw creatorId
 */
export async function addCreatorToCampaign(input: AddCreatorToCampaignInput) {
  // Verify the campaign and brand creator exist and belong to the same brand
  const [campaign, brandCreator] = await Promise.all([
    db.query.campaigns.findFirst({
      where: eq(campaigns.id, input.campaignId),
    }),
    db.query.brandCreators.findFirst({
      where: eq(brandCreators.id, input.brandCreatorId),
    }),
  ]);

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  if (!brandCreator) {
    throw new Error("BrandCreator not found");
  }

  if (campaign.brandId !== brandCreator.brandId) {
    throw new Error("Creator must belong to the same brand as the campaign");
  }

  // Check if already in campaign
  const existing = await db.query.campaignCreators.findFirst({
    where: and(
      eq(campaignCreators.campaignId, input.campaignId),
      eq(campaignCreators.brandCreatorId, input.brandCreatorId)
    ),
  });

  if (existing) {
    throw new Error("Creator is already in this campaign");
  }

  const now = new Date();

  const [newCampaignCreator] = await db
    .insert(campaignCreators)
    .values({
      campaignId: input.campaignId,
      brandCreatorId: input.brandCreatorId,
      status: "shortlisted",
      rate: input.rate?.toString() || null,
      rateType: input.rateType || null,
      currency: input.currency || "USD",
      deliverableCount: input.deliverableCount || null,
      notes: input.notes || null,
      shortlistedAt: now,
    })
    .returning();

  revalidatePath(`/campaigns/${input.campaignId}`);
  revalidatePath(`/brands/${brandCreator.brandId}`);
  revalidatePath(`/brands/${brandCreator.brandId}/track`);

  return newCampaignCreator;
}

/**
 * Update campaign creator status (move through pipeline)
 */
export async function updateCampaignCreatorStatus(
  id: string,
  status: CampaignCreatorStatus
) {
  const now = new Date();

  // Build update object with appropriate timestamps
  const updateData: Record<string, any> = {
    status,
    updatedAt: now,
  };

  // Set timestamps based on status transitions
  switch (status) {
    case "shortlisted":
      updateData.shortlistedAt = now;
      break;
    case "invited":
      updateData.invitedAt = now;
      break;
    case "accepted":
      updateData.acceptedAt = now;
      break;
    case "ready":
      updateData.readyAt = now;
      break;
    case "completed":
      updateData.completedAt = now;
      break;
  }

  const [updated] = await db
    .update(campaignCreators)
    .set(updateData)
    .where(eq(campaignCreators.id, id))
    .returning();

  revalidatePath(`/campaigns/${updated.campaignId}`);
  revalidatePath(`/campaigns/${updated.campaignId}/creators/${id}`);

  return updated;
}

/**
 * Update campaign creator notes
 */
export async function updateCampaignCreatorNotes(id: string, notes: string) {
  const [updated] = await db
    .update(campaignCreators)
    .set({
      notes,
      updatedAt: new Date(),
    })
    .where(eq(campaignCreators.id, id))
    .returning();

  revalidatePath(`/campaigns/${updated.campaignId}`);
  revalidatePath(`/campaigns/${updated.campaignId}/creators/${id}`);

  return updated;
}

/**
 * Update campaign creator rate
 */
export async function updateCampaignCreatorRate(
  id: string,
  rate: number,
  rateType: "flat" | "per_post" | "per_view" | "affiliate"
) {
  const [updated] = await db
    .update(campaignCreators)
    .set({
      rate: rate.toString(),
      rateType,
      updatedAt: new Date(),
    })
    .where(eq(campaignCreators.id, id))
    .returning();

  revalidatePath(`/campaigns/${updated.campaignId}`);
  revalidatePath(`/campaigns/${updated.campaignId}/creators/${id}`);

  return updated;
}
