"use server";

import { db } from "@/lib/db";
import { outreaches, creatorPlatforms, brandCreators } from "@/lib/db/schema";
import { eq, inArray, and, or, isNull, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { generateOutreachMessage } from "@/lib/ai/generate-outreach";
import { generateFollowUpMessage } from "@/lib/ai/generate-followup";

// =============================================================================
// TYPES
// =============================================================================
export type OutreachLead = {
  id: string;
  status: string;
  lastContactedAt: Date | null;
  firstContactedAt: Date | null;
  creator: {
    id: string;
    name: string;
    bio: string | null;
    avatarUrl: string | null;
    tier: string | null;
    platforms: {
      platformId: string;
      handle: string;
      followerCount: number | null;
    }[];
  };
};

export type FollowUpLead = OutreachLead & {
  daysSinceContact: number;
  followUpNumber: 1 | 2;
};

export type GenerateOutreachResult =
  | { success: true; outreachId: string; message: string }
  | { success: false; error: string };

export type UpdateOutreachResult =
  | { success: true }
  | { success: false; error: string };

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get leads ready for initial outreach (not yet contacted)
 */
export async function getLeadsForOutreach(brandId: string): Promise<OutreachLead[]> {
  const result = await db.query.brandCreators.findMany({
    where: and(
      eq(brandCreators.brandId, brandId),
      inArray(brandCreators.status, ["discovered", "researching", "qualified"]),
      eq(brandCreators.doNotContact, false)
    ),
    with: {
      creator: {
        with: {
          platforms: true,
        },
      },
    },
    orderBy: (bc, { desc }) => [desc(bc.createdAt)],
  });

  return result.map((bc) => ({
    id: bc.id,
    status: bc.status,
    lastContactedAt: bc.lastContactedAt,
    firstContactedAt: bc.firstContactedAt,
    creator: {
      id: bc.creator.id,
      name: bc.creator.name,
      bio: bc.creator.bio,
      avatarUrl: bc.creator.avatarUrl,
      tier: bc.creator.tier,
      platforms: bc.creator.platforms.map((p) => ({
        platformId: p.platformId,
        handle: p.handle,
        followerCount: p.followerCount,
      })),
    },
  }));
}

/**
 * Get leads ready for follow-up (contacted but no response after X days)
 */
export async function getLeadsForFollowUp(
  brandId: string,
  followUpNumber: 1 | 2
): Promise<FollowUpLead[]> {
  const now = new Date();
  const daysThreshold = followUpNumber === 1 ? 3 : 8; // FU1 after 3 days, FU2 after 8 days total
  const cutoffDate = new Date(now.getTime() - daysThreshold * 24 * 60 * 60 * 1000);

  const result = await db.query.brandCreators.findMany({
    where: and(
      eq(brandCreators.brandId, brandId),
      eq(brandCreators.status, "contacted"),
      eq(brandCreators.doNotContact, false),
      lte(brandCreators.lastContactedAt, cutoffDate)
    ),
    with: {
      creator: {
        with: {
          platforms: true,
        },
      },
    },
    orderBy: (bc, { asc }) => [asc(bc.lastContactedAt)],
  });

  return result.map((bc) => {
    const daysSinceContact = bc.lastContactedAt
      ? Math.floor((now.getTime() - new Date(bc.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      id: bc.id,
      status: bc.status,
      lastContactedAt: bc.lastContactedAt,
      firstContactedAt: bc.firstContactedAt,
      daysSinceContact,
      followUpNumber,
      creator: {
        id: bc.creator.id,
        name: bc.creator.name,
        bio: bc.creator.bio,
        avatarUrl: bc.creator.avatarUrl,
        tier: bc.creator.tier,
        platforms: bc.creator.platforms.map((p) => ({
          platformId: p.platformId,
          handle: p.handle,
          followerCount: p.followerCount,
        })),
      },
    };
  });
}

/**
 * Get leads ready for re-engagement (declined/ghosted 90+ days ago)
 */
export async function getLeadsForReEngage(brandId: string): Promise<FollowUpLead[]> {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const result = await db.query.brandCreators.findMany({
    where: and(
      eq(brandCreators.brandId, brandId),
      inArray(brandCreators.status, ["contacted", "paused", "churned"]),
      eq(brandCreators.doNotContact, false),
      lte(brandCreators.lastContactedAt, cutoffDate)
    ),
    with: {
      creator: {
        with: {
          platforms: true,
        },
      },
    },
    orderBy: (bc, { asc }) => [asc(bc.lastContactedAt)],
  });

  return result.map((bc) => {
    const daysSinceContact = bc.lastContactedAt
      ? Math.floor((now.getTime() - new Date(bc.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      id: bc.id,
      status: bc.status,
      lastContactedAt: bc.lastContactedAt,
      firstContactedAt: bc.firstContactedAt,
      daysSinceContact,
      followUpNumber: 2, // Re-engage counts as FU2 for messaging purposes
      creator: {
        id: bc.creator.id,
        name: bc.creator.name,
        bio: bc.creator.bio,
        avatarUrl: bc.creator.avatarUrl,
        tier: bc.creator.tier,
        platforms: bc.creator.platforms.map((p) => ({
          platformId: p.platformId,
          handle: p.handle,
          followerCount: p.followerCount,
        })),
      },
    };
  });
}

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Generate a personalized outreach DM for a brand-creator relationship.
 * Creates a draft outreach record and returns the generated message.
 */
export async function generateOutreachAction(
  brandCreatorId: string
): Promise<GenerateOutreachResult> {
  // Fetch everything we need
  const brandCreator = await db.query.brandCreators.findFirst({
    where: (bc, { eq }) => eq(bc.id, brandCreatorId),
    with: { brand: true, creator: true },
  });

  if (!brandCreator) return { success: false, error: "Record not found." };

  const platforms = await db
    .select()
    .from(creatorPlatforms)
    .where(eq(creatorPlatforms.creatorId, brandCreator.creator.id));

  let message: string;
  try {
    message = await generateOutreachMessage({
      brand: {
        name: brandCreator.brand.name,
        analysis: brandCreator.brand.brandAnalysis,
      },
      creator: {
        name: brandCreator.creator.name,
        bio: brandCreator.creator.bio,
        platforms: platforms.map((p) => ({
          platformId: p.platformId,
          handle: p.handle,
          followerCount: p.followerCount,
        })),
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error };
  }

  // Save as draft outreach record
  const [outreach] = await db
    .insert(outreaches)
    .values({
      brandCreatorId,
      channel: "other",
      message,
      status: "draft",
    })
    .returning();

  revalidatePath(`/brands/${brandCreator.brand.id}/leads`);
  return { success: true, outreachId: outreach.id, message };
}

/**
 * Save edits to a draft outreach message.
 */
export async function updateOutreachMessageAction(
  outreachId: string,
  message: string
): Promise<UpdateOutreachResult> {
  if (!message.trim()) return { success: false, error: "Message cannot be empty." };

  await db
    .update(outreaches)
    .set({ message: message.trim(), updatedAt: new Date() })
    .where(eq(outreaches.id, outreachId));

  return { success: true };
}

export type GenerateFollowUpResult =
  | { success: true; outreachId: string; message: string }
  | { success: false; error: string };

/**
 * Generate a follow-up DM for a contacted creator who hasn't replied.
 * Pulls the most recent sent/draft outreach as context for the follow-up.
 */
export async function generateFollowUpAction(
  brandCreatorId: string
): Promise<GenerateFollowUpResult> {
  const { desc } = await import("drizzle-orm");

  const brandCreator = await db.query.brandCreators.findFirst({
    where: (bc, { eq }) => eq(bc.id, brandCreatorId),
    with: { brand: true, creator: true },
  });

  if (!brandCreator) return { success: false, error: "Record not found." };
  if (!brandCreator.lastContactedAt)
    return { success: false, error: "No contact date recorded." };

  const daysSinceContact = Math.floor(
    (Date.now() - new Date(brandCreator.lastContactedAt).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // Fetch the most recent outreach message as context
  const [lastOutreach] = await db
    .select({ message: outreaches.message })
    .from(outreaches)
    .where(eq(outreaches.brandCreatorId, brandCreatorId))
    .orderBy(desc(outreaches.createdAt))
    .limit(1);

  const platforms = await db
    .select()
    .from(creatorPlatforms)
    .where(eq(creatorPlatforms.creatorId, brandCreator.creator.id));

  let message: string;
  try {
    message = await generateFollowUpMessage({
      brand: {
        name: brandCreator.brand.name,
        analysis: brandCreator.brand.brandAnalysis,
      },
      creator: {
        name: brandCreator.creator.name,
        platforms: platforms.map((p) => ({
          platformId: p.platformId,
          handle: p.handle,
        })),
      },
      daysSinceContact,
      originalMessage: lastOutreach?.message ?? null,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error };
  }

  const [outreach] = await db
    .insert(outreaches)
    .values({
      brandCreatorId,
      channel: "other",
      message,
      status: "draft",
    })
    .returning();

  revalidatePath(`/brands/${brandCreator.brand.id}/leads`);
  return { success: true, outreachId: outreach.id, message };
}

// =============================================================================
// OUTREACH WORKFLOW ACTIONS
// =============================================================================

export type MarkOutreachResult = 
  | { success: true }
  | { success: false; error: string };

/**
 * Mark a lead as DM sent - updates status to "contacted" and records timestamp
 */
export async function markDMSentAction(
  brandCreatorId: string,
  message?: string
): Promise<MarkOutreachResult> {
  const now = new Date();
  
  const brandCreator = await db.query.brandCreators.findFirst({
    where: (bc, { eq }) => eq(bc.id, brandCreatorId),
    columns: { brandId: true, firstContactedAt: true },
  });

  if (!brandCreator) return { success: false, error: "Record not found." };

  // Update brand creator status
  await db
    .update(brandCreators)
    .set({
      status: "contacted",
      lastContactedAt: now,
      firstContactedAt: brandCreator.firstContactedAt ?? now,
      updatedAt: now,
    })
    .where(eq(brandCreators.id, brandCreatorId));

  // If we have a message, create/update outreach record
  if (message) {
    await db.insert(outreaches).values({
      brandCreatorId,
      channel: "instagram_dm",
      message,
      status: "sent",
      sentAt: now,
    });
  }

  revalidatePath(`/brands/${brandCreator.brandId}/send-dms`);
  revalidatePath(`/brands/${brandCreator.brandId}/leads`);
  revalidatePath(`/brands/${brandCreator.brandId}/follow-ups`);
  
  return { success: true };
}

/**
 * Mark that we commented on a lead's post
 */
export async function markCommentedAction(
  brandCreatorId: string,
  comment?: string
): Promise<MarkOutreachResult> {
  const now = new Date();
  
  const brandCreator = await db.query.brandCreators.findFirst({
    where: (bc, { eq }) => eq(bc.id, brandCreatorId),
    columns: { brandId: true },
  });

  if (!brandCreator) return { success: false, error: "Record not found." };

  // Create outreach record for the comment
  if (comment) {
    await db.insert(outreaches).values({
      brandCreatorId,
      channel: "other",
      message: comment,
      status: "sent",
      sentAt: now,
    });
  }

  revalidatePath(`/brands/${brandCreator.brandId}/send-dms`);
  
  return { success: true };
}

/**
 * Skip a lead (mark as unqualified)
 */
export async function skipLeadAction(
  brandCreatorId: string,
  reason?: string
): Promise<MarkOutreachResult> {
  const brandCreator = await db.query.brandCreators.findFirst({
    where: (bc, { eq }) => eq(bc.id, brandCreatorId),
    columns: { brandId: true, notes: true },
  });

  if (!brandCreator) return { success: false, error: "Record not found." };

  const notes = reason 
    ? `${brandCreator.notes ? brandCreator.notes + "\n" : ""}Skipped: ${reason}`
    : brandCreator.notes;

  await db
    .update(brandCreators)
    .set({
      status: "unqualified",
      notes,
      updatedAt: new Date(),
    })
    .where(eq(brandCreators.id, brandCreatorId));

  revalidatePath(`/brands/${brandCreator.brandId}/send-dms`);
  revalidatePath(`/brands/${brandCreator.brandId}/leads`);
  
  return { success: true };
}

/**
 * Mark a follow-up as sent
 */
export async function markFollowUpSentAction(
  brandCreatorId: string,
  message?: string
): Promise<MarkOutreachResult> {
  const now = new Date();
  
  const brandCreator = await db.query.brandCreators.findFirst({
    where: (bc, { eq }) => eq(bc.id, brandCreatorId),
    columns: { brandId: true },
  });

  if (!brandCreator) return { success: false, error: "Record not found." };

  // Update last contacted timestamp
  await db
    .update(brandCreators)
    .set({
      lastContactedAt: now,
      updatedAt: now,
    })
    .where(eq(brandCreators.id, brandCreatorId));

  // Record the follow-up message
  if (message) {
    await db.insert(outreaches).values({
      brandCreatorId,
      channel: "instagram_dm",
      message,
      status: "sent",
      sentAt: now,
    });
  }

  revalidatePath(`/brands/${brandCreator.brandId}/follow-ups`);
  revalidatePath(`/brands/${brandCreator.brandId}/leads`);
  
  return { success: true };
}
