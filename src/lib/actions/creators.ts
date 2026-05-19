"use server";

import { db } from "@/lib/db";
import { creators, creatorPlatforms } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/access";

// =============================================================================
// TYPES
// =============================================================================
export type CreateCreatorInput = {
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  country?: string;
  city?: string;
  primaryPlatform?: string;
  tier?: "nano" | "micro" | "mid" | "macro" | "mega";
};

export type AddCreatorPlatformInput = {
  creatorId: string;
  platformId: string;
  handle: string;
  profileUrl?: string;
  followerCount?: number;
  engagementRate?: number;
  verified?: boolean;
};

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get all creators with their platforms
 */
export async function getCreators() {
  await requireUser();

  const result = await db.query.creators.findMany({
    with: {
      platforms: true,
    },
    orderBy: (creators, { desc }) => [desc(creators.createdAt)],
  });

  return result;
}

/**
 * Get a single creator by ID with public identity/platform data.
 * Shipping addresses are intentionally not returned from this global identity helper.
 */
export async function getCreatorById(id: string) {
  await requireUser();

  const result = await db.query.creators.findFirst({
    where: eq(creators.id, id),
    with: {
      platforms: true,
    },
  });

  return result;
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new creator
 */
export async function createCreator(input: CreateCreatorInput) {
  await requireUser();

  const [newCreator] = await db
    .insert(creators)
    .values({
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      bio: input.bio || null,
      country: input.country || null,
      city: input.city || null,
      primaryPlatform: input.primaryPlatform || null,
      tier: input.tier || null,
    })
    .returning();

  revalidatePath("/creators");

  return newCreator;
}

/**
 * Add a platform to a creator
 */
export async function addCreatorPlatform(input: AddCreatorPlatformInput) {
  await requireUser();

  const [newPlatform] = await db
    .insert(creatorPlatforms)
    .values({
      creatorId: input.creatorId,
      platformId: input.platformId,
      handle: input.handle,
      profileUrl: input.profileUrl || null,
      followerCount: input.followerCount || null,
      engagementRate: input.engagementRate?.toString() || null,
      verified: input.verified || false,
    })
    .returning();

  revalidatePath(`/creators/${input.creatorId}`);
  revalidatePath("/creators");

  return newPlatform;
}
