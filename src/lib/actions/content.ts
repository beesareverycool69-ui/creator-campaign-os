"use server";

import { db } from "@/lib/db";
import {
  contents,
  contentRevisions,
  contentMetrics,
  campaignCreators,
} from "@/lib/db/schema";
import {
  requireOwnedCampaign,
  requireOwnedCampaignCreator,
  requireOwnedContent,
} from "@/lib/auth/access";
import { eq, desc, count, and, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// =============================================================================
// TYPES
// =============================================================================
export type ContentStatus =
  | "pending"
  | "in_progress"
  | "submitted"
  | "in_review"
  | "revision_requested"
  | "approved"
  | "rejected"
  | "cancelled"
  | "scheduled"
  | "posting"
  | "posted"
  | "live";

export type ContentType = "post" | "story" | "reel" | "video" | "short" | "tweet" | "other";

export type SubmitContentInput = {
  campaignCreatorId: string;
  type: ContentType;
  title?: string;
  caption?: string;
  fileUrls: string[];
  thumbnailUrl?: string;
  platformId?: string;
  notes?: string;
};

export type AddMetricsInput = {
  contentId: string;
  views?: number;
  impressions?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  clicks?: number;
  watchTimeSeconds?: number;
  avgWatchPercentage?: number;
};

export type ContentWithDetails = {
  id: string;
  type: string;
  title: string | null;
  caption: string | null;
  fileUrls: string[] | null;
  thumbnailUrl: string | null;
  postUrl: string | null;
  status: ContentStatus;
  revisionCount: number | null;
  postedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  platformId: string | null;
};

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get all content for a campaign creator
 */
export async function getContent(
  campaignCreatorId: string
): Promise<ContentWithDetails[]> {
  await requireOwnedCampaignCreator(campaignCreatorId);

  const result = await db.query.contents.findMany({
    where: eq(contents.campaignCreatorId, campaignCreatorId),
    orderBy: [desc(contents.createdAt)],
  });

  return result.map((c) => ({
    id: c.id,
    type: c.type,
    title: c.title,
    caption: c.caption,
    fileUrls: c.fileUrls,
    thumbnailUrl: c.thumbnailUrl,
    postUrl: c.postUrl,
    status: c.status as ContentStatus,
    revisionCount: c.revisionCount,
    postedAt: c.postedAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    platformId: c.platformId,
  }));
}

/**
 * Get single content item by ID with revisions and metrics
 */
export async function getContentById(id: string) {
  await requireOwnedContent(id);

  const result = await db.query.contents.findFirst({
    where: eq(contents.id, id),
    with: {
      revisions: {
        orderBy: (revisions, { desc }) => [desc(revisions.createdAt)],
      },
      metrics: {
        orderBy: (metrics, { desc }) => [desc(metrics.recordedAt)],
        limit: 10,
      },
      campaignCreator: {
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
                },
              },
            },
          },
        },
      },
    },
  });

  return result;
}

/**
 * Get content summary stats for a campaign creator
 */
export async function getContentStats(campaignCreatorId: string) {
  await requireOwnedCampaignCreator(campaignCreatorId);

  const allContent = await db.query.contents.findMany({
    where: eq(contents.campaignCreatorId, campaignCreatorId),
    columns: {
      status: true,
    },
  });

  const stats = {
    total: allContent.length,
    submitted: 0,
    approved: 0,
    posted: 0,
    revisionRequested: 0,
  };

  for (const c of allContent) {
    if (c.status === "submitted" || c.status === "in_review") stats.submitted++;
    if (c.status === "approved") stats.approved++;
    if (c.status === "posted" || c.status === "live") stats.posted++;
    if (c.status === "revision_requested") stats.revisionRequested++;
  }

  return stats;
}

/**
 * Get content summary across all creators in a campaign
 */
export async function getCampaignContentSummary(campaignId: string) {
  await requireOwnedCampaign(campaignId);

  // Get all campaign creators for this campaign
  const creators = await db.query.campaignCreators.findMany({
    where: eq(campaignCreators.campaignId, campaignId),
    columns: { id: true },
  });

  const creatorIds = creators.map((c) => c.id);

  if (creatorIds.length === 0) {
    return { total: 0, submitted: 0, approved: 0, posted: 0 };
  }

  const allContent = await db.query.contents.findMany({
    where: inArray(contents.campaignCreatorId, creatorIds),
    columns: { status: true },
  });

  const summary = {
    total: allContent.length,
    submitted: 0,
    approved: 0,
    posted: 0,
  };

  for (const c of allContent) {
    if (["submitted", "in_review"].includes(c.status)) summary.submitted++;
    if (c.status === "approved") summary.approved++;
    if (["posted", "live", "completed"].includes(c.status)) summary.posted++;
  }

  return summary;
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Submit new content
 */
export async function submitContent(input: SubmitContentInput) {
  await requireOwnedCampaignCreator(input.campaignCreatorId);

  const [newContent] = await db
    .insert(contents)
    .values({
      campaignCreatorId: input.campaignCreatorId,
      type: input.type,
      title: input.title || null,
      caption: input.caption || null,
      fileUrls: input.fileUrls,
      thumbnailUrl: input.thumbnailUrl || null,
      platformId: input.platformId || null,
      notes: input.notes || null,
      status: "submitted",
      revisionCount: 0,
    })
    .returning();

  // Get campaign ID for revalidation
  const cc = await db.query.campaignCreators.findFirst({
    where: eq(campaignCreators.id, input.campaignCreatorId),
    columns: { campaignId: true },
  });

  if (cc) {
    revalidatePath(
      `/campaigns/${cc.campaignId}/creators/${input.campaignCreatorId}/content`
    );
    revalidatePath(
      `/campaigns/${cc.campaignId}/creators/${input.campaignCreatorId}`
    );
    revalidatePath(`/campaigns/${cc.campaignId}`);
  }

  return newContent;
}

/**
 * Update content status
 */
export async function updateContentStatus(id: string, status: ContentStatus) {
  await requireOwnedContent(id);

  const [updated] = await db
    .update(contents)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(contents.id, id))
    .returning();

  await revalidateContentPaths(updated.campaignCreatorId, id);

  return updated;
}

/**
 * Request revision with feedback
 */
export async function requestRevision(id: string, feedback: string, fileUrls?: string[]) {
  await requireOwnedContent(id);

  const content = await db.query.contents.findFirst({
    where: eq(contents.id, id),
  });

  if (!content) {
    throw new Error("Content not found");
  }

  // Create revision record
  await db.insert(contentRevisions).values({
    contentId: id,
    feedback,
    fileUrls: fileUrls || null,
  });

  // Update content status and revision count
  const [updated] = await db
    .update(contents)
    .set({
      status: "revision_requested",
      revisionCount: (content.revisionCount || 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(contents.id, id))
    .returning();

  await revalidateContentPaths(updated.campaignCreatorId, id);

  return updated;
}

/**
 * Approve content
 */
export async function approveContent(id: string) {
  await requireOwnedContent(id);

  const [updated] = await db
    .update(contents)
    .set({
      status: "approved",
      approvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(contents.id, id))
    .returning();

  await revalidateContentPaths(updated.campaignCreatorId, id);

  return updated;
}

/**
 * Reject content
 */
export async function rejectContent(id: string, feedback?: string) {
  await requireOwnedContent(id);

  // Add rejection feedback as revision if provided
  if (feedback) {
    await db.insert(contentRevisions).values({
      contentId: id,
      feedback: `REJECTED: ${feedback}`,
    });
  }

  const [updated] = await db
    .update(contents)
    .set({
      status: "rejected",
      updatedAt: new Date(),
    })
    .where(eq(contents.id, id))
    .returning();

  await revalidateContentPaths(updated.campaignCreatorId, id);

  return updated;
}

/**
 * Mark content as posted
 */
export async function markAsPosted(
  id: string,
  postUrl: string,
  postedAt?: Date
) {
  await requireOwnedContent(id);

  const [updated] = await db
    .update(contents)
    .set({
      status: "posted",
      postUrl,
      postedAt: postedAt || new Date(),
      updatedAt: new Date(),
    })
    .where(eq(contents.id, id))
    .returning();

  await revalidateContentPaths(updated.campaignCreatorId, id);

  return updated;
}

/**
 * Mark content as live (verified as still up)
 */
export async function markAsLive(id: string) {
  await requireOwnedContent(id);

  const [updated] = await db
    .update(contents)
    .set({
      status: "live",
      updatedAt: new Date(),
    })
    .where(eq(contents.id, id))
    .returning();

  await revalidateContentPaths(updated.campaignCreatorId, id);

  return updated;
}

/**
 * Add content metrics
 */
export async function addContentMetrics(input: AddMetricsInput) {
  await requireOwnedContent(input.contentId);

  // Calculate engagement rate if we have enough data
  let engagementRate: string | null = null;
  if (input.views && input.views > 0) {
    const engagements =
      (input.likes || 0) +
      (input.comments || 0) +
      (input.shares || 0) +
      (input.saves || 0);
    engagementRate = ((engagements / input.views) * 100).toFixed(2);
  }

  const [newMetrics] = await db
    .insert(contentMetrics)
    .values({
      contentId: input.contentId,
      recordedAt: new Date(),
      views: input.views || null,
      impressions: input.impressions || null,
      reach: input.reach || null,
      likes: input.likes || null,
      comments: input.comments || null,
      shares: input.shares || null,
      saves: input.saves || null,
      clicks: input.clicks || null,
      watchTimeSeconds: input.watchTimeSeconds || null,
      avgWatchPercentage: input.avgWatchPercentage?.toString() || null,
      engagementRate,
    })
    .returning();

  // Get content for revalidation
  const content = await db.query.contents.findFirst({
    where: eq(contents.id, input.contentId),
    columns: { campaignCreatorId: true },
  });

  if (content) {
    await revalidateContentPaths(content.campaignCreatorId, input.contentId);
  }

  return newMetrics;
}

/**
 * Update content details
 */
export async function updateContent(
  id: string,
  updates: Partial<{
    title: string;
    caption: string;
    fileUrls: string[];
    thumbnailUrl: string;
    notes: string;
  }>
) {
  await requireOwnedContent(id);

  const [updated] = await db
    .update(contents)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(contents.id, id))
    .returning();

  await revalidateContentPaths(updated.campaignCreatorId, id);

  return updated;
}

// =============================================================================
// HELPERS
// =============================================================================

async function revalidateContentPaths(campaignCreatorId: string, contentId: string) {
  const cc = await db.query.campaignCreators.findFirst({
    where: eq(campaignCreators.id, campaignCreatorId),
    columns: { campaignId: true },
  });

  if (cc) {
    revalidatePath(
      `/campaigns/${cc.campaignId}/creators/${campaignCreatorId}/content`
    );
    revalidatePath(
      `/campaigns/${cc.campaignId}/creators/${campaignCreatorId}/content/${contentId}`
    );
    revalidatePath(
      `/campaigns/${cc.campaignId}/creators/${campaignCreatorId}`
    );
    revalidatePath(`/campaigns/${cc.campaignId}`);
  }
}
