"use server";

import { db } from "@/lib/db";
import { creators, creatorPlatforms, addresses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
  const result = await db.query.creators.findMany({
    with: {
      platforms: true,
    },
    orderBy: (creators, { desc }) => [desc(creators.createdAt)],
  });

  return result;
}

/**
 * Get a single creator by ID with platforms and addresses
 */
export async function getCreatorById(id: string) {
  const result = await db.query.creators.findFirst({
    where: eq(creators.id, id),
    with: {
      platforms: true,
      addresses: true,
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
