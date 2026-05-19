"use server";

import { db } from "@/lib/db";
import { brandCreators, creators, creatorPlatforms } from "@/lib/db/schema";
import { requireOwnedBrand, requireOwnedBrandCreator } from "@/lib/auth/access";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// =============================================================================
// TYPES
// =============================================================================
export type LeadStatus =
  | "discovered"
  | "researching"
  | "qualified"
  | "unqualified"
  | "contacted"
  | "engaged"
  | "active"
  | "paused"
  | "churned"
  | "blacklisted";

export type AddCreatorToBrandInput = {
  brandId: string;
  creatorId: string;
  status?: LeadStatus;
  source?: string;
  sourceDetail?: string;
  notes?: string;
};

export type BrandCreatorWithDetails = {
  id: string;
  status: LeadStatus;
  source: string | null;
  sourceDetail: string | null;
  notes: string | null;
  firstContactedAt: Date | null;
  lastContactedAt: Date | null;
  lastActiveAt: Date | null;
  createdAt: Date;
  creator: {
    id: string;
    name: string;
    email: string | null;
    avatarUrl: string | null;
    country: string | null;
    tier: string | null;
    platforms: {
      id: string;
      platformId: string;
      handle: string;
      followerCount: number | null;
    }[];
  };
};

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get all creators linked to a brand with their lead status
 */
export async function getBrandCreators(
  brandId: string,
  statusFilter?: LeadStatus
): Promise<BrandCreatorWithDetails[]> {
  await requireOwnedBrand(brandId);

  // Build where clause
  const whereClause = statusFilter
    ? and(
        eq(brandCreators.brandId, brandId),
        eq(brandCreators.status, statusFilter)
      )
    : eq(brandCreators.brandId, brandId);

  const result = await db.query.brandCreators.findMany({
    where: whereClause,
    with: {
      creator: {
        with: {
          platforms: true,
        },
      },
    },
    orderBy: (brandCreators, { desc }) => [desc(brandCreators.createdAt)],
  });

  return result.map((bc) => ({
    id: bc.id,
    status: bc.status as LeadStatus,
    source: bc.source,
    sourceDetail: bc.sourceDetail,
    notes: bc.notes,
    firstContactedAt: bc.firstContactedAt,
    lastContactedAt: bc.lastContactedAt,
    lastActiveAt: bc.lastActiveAt,
    createdAt: bc.createdAt,
    creator: {
      id: bc.creator.id,
      name: bc.creator.name,
      email: bc.creator.email,
      avatarUrl: bc.creator.avatarUrl,
      country: bc.creator.country,
      tier: bc.creator.tier,
      platforms: bc.creator.platforms.map((p) => ({
        id: p.id,
        platformId: p.platformId,
        handle: p.handle,
        followerCount: p.followerCount,
      })),
    },
  }));
}

/**
 * Get a single brand-creator relationship
 */
export async function getBrandCreatorById(id: string) {
  await requireOwnedBrandCreator(id);

  const result = await db.query.brandCreators.findFirst({
    where: eq(brandCreators.id, id),
    with: {
      creator: {
        with: {
          platforms: true,
        },
      },
      brand: true,
    },
  });

  return result;
}

/**
 * Get lead status counts for a brand
 */
export async function getLeadStatusCounts(brandId: string) {
  const result = await db.query.brandCreators.findMany({
    where: eq(brandCreators.brandId, brandId),
    columns: {
      status: true,
    },
  });

  const counts: Record<string, number> = {};
  for (const bc of result) {
    counts[bc.status] = (counts[bc.status] || 0) + 1;
  }

  return counts;
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Add a creator to a brand (create BrandCreator record)
 */
export async function addCreatorToBrand(input: AddCreatorToBrandInput) {
  await requireOwnedBrand(input.brandId);

  // Check if relationship already exists
  const existing = await db.query.brandCreators.findFirst({
    where: and(
      eq(brandCreators.brandId, input.brandId),
      eq(brandCreators.creatorId, input.creatorId)
    ),
  });

  if (existing) {
    throw new Error("Creator is already linked to this brand");
  }

  const [newBrandCreator] = await db
    .insert(brandCreators)
    .values({
      brandId: input.brandId,
      creatorId: input.creatorId,
      status: input.status || "discovered",
      source: input.source || null,
      sourceDetail: input.sourceDetail || null,
      notes: input.notes || null,
    })
    .returning();

  revalidatePath(`/brands/${input.brandId}`);
  revalidatePath(`/brands/${input.brandId}/leads`);

  return newBrandCreator;
}

/**
 * Update the lead status of a brand-creator relationship
 */
export async function updateLeadStatus(id: string, status: LeadStatus) {
  await requireOwnedBrandCreator(id);

  const now = new Date();

  // Build update object based on status
  const updateData: Record<string, any> = {
    status,
    updatedAt: now,
  };

  // Track contact timestamps
  if (status === "contacted" || status === "engaged") {
    updateData.lastContactedAt = now;
  }

  // Set firstContactedAt if transitioning to contacted for the first time
  if (status === "contacted") {
    const existing = await db.query.brandCreators.findFirst({
      where: eq(brandCreators.id, id),
      columns: { firstContactedAt: true, brandId: true },
    });

    if (existing && !existing.firstContactedAt) {
      updateData.firstContactedAt = now;
    }
  }

  // Track active timestamp
  if (status === "active") {
    updateData.lastActiveAt = now;
  }

  const [updated] = await db
    .update(brandCreators)
    .set(updateData)
    .where(eq(brandCreators.id, id))
    .returning();

  revalidatePath(`/brands/${updated.brandId}`);
  revalidatePath(`/brands/${updated.brandId}/leads`);

  return updated;
}

/**
 * Update notes for a brand-creator relationship
 */
export async function updateBrandCreatorNotes(id: string, notes: string) {
  await requireOwnedBrandCreator(id);

  const [updated] = await db
    .update(brandCreators)
    .set({
      notes,
      updatedAt: new Date(),
    })
    .where(eq(brandCreators.id, id))
    .returning();

  revalidatePath(`/brands/${updated.brandId}`);
  revalidatePath(`/brands/${updated.brandId}/leads`);

  return updated;
}

// Pipeline stage tags used to track affiliate workflow state in notes field
export type PipelineStage = "shipped" | "delivered" | "content_received" | "approved" | "posted";

const STAGE_TAG: Record<PipelineStage, string> = {
  shipped: "[SHIPPED]",
  delivered: "[DELIVERED]",
  content_received: "[CONTENT_RECEIVED]",
  approved: "[APPROVED]",
  posted: "[POSTED]",
};

/**
 * Advance an affiliate creator to the next pipeline stage.
 * Stages are tracked as tags in the notes field.
 */
export async function advancePipelineStage(id: string, stage: PipelineStage) {
  await requireOwnedBrandCreator(id);

  const existing = await db.query.brandCreators.findFirst({
    where: eq(brandCreators.id, id),
    columns: { notes: true, brandId: true },
  });

  if (!existing) throw new Error("Record not found.");

  const tag = STAGE_TAG[stage];
  const notes = existing.notes?.includes(tag)
    ? existing.notes
    : `${existing.notes ?? ""}${existing.notes ? " " : ""}${tag}`;

  const [updated] = await db
    .update(brandCreators)
    .set({ notes, updatedAt: new Date() })
    .where(eq(brandCreators.id, id))
    .returning();

  revalidatePath(`/brands/${updated.brandId}/affiliates`);
  return updated;
}
