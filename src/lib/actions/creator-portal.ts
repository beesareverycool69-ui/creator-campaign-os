"use server";

import { db } from "@/lib/db";
import { campaignCreators, contents } from "@/lib/db/schema";
import { brandCreators, brands } from "@/lib/db/schema";
import { creators } from "@/lib/db/schema";
import { campaigns } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createHmac } from "crypto";

// Simple token generation - in production use a proper JWT or signed token
const SECRET = process.env.PORTAL_SECRET || "creator-portal-secret-change-me";

function generateTokenSync(campaignCreatorId: string): string {
  const hmac = createHmac("sha256", SECRET);
  hmac.update(campaignCreatorId);
  const signature = hmac.digest("hex").substring(0, 16);
  return `${campaignCreatorId}-${signature}`;
}

function validateTokenSync(token: string): string | null {
  const parts = token.split("-");
  if (parts.length < 2) return null;

  const signature = parts.pop();
  const campaignCreatorId = parts.join("-"); // handle UUIDs with dashes

  const expectedToken = generateTokenSync(campaignCreatorId);
  const expectedSignature = expectedToken.split("-").pop();

  if (signature === expectedSignature) {
    return campaignCreatorId;
  }
  return null;
}

export async function getPortalData(token: string) {
  const campaignCreatorId = validateTokenSync(token);
  if (!campaignCreatorId) {
    return null;
  }

  // Get full campaign creator data with all relations
  const [result] = await db
    .select({
      campaignCreator: campaignCreators,
      campaign: campaigns,
      brandCreator: brandCreators,
      brand: brands,
      creator: creators,
    })
    .from(campaignCreators)
    .innerJoin(campaigns, eq(campaignCreators.campaignId, campaigns.id))
    .innerJoin(brandCreators, eq(campaignCreators.brandCreatorId, brandCreators.id))
    .innerJoin(brands, eq(brandCreators.brandId, brands.id))
    .innerJoin(creators, eq(brandCreators.creatorId, creators.id))
    .where(eq(campaignCreators.id, campaignCreatorId))
    .limit(1);

  if (!result) {
    return null;
  }

  // Get existing content submissions
  const contentList = await db
    .select()
    .from(contents)
    .where(eq(contents.campaignCreatorId, campaignCreatorId));

  return {
    ...result,
    contents: contentList,
  };
}

export async function submitContent(
  token: string,
  data: {
    type: "video" | "story" | "reel" | "short" | "post" | "tweet" | "other";
    title?: string;
    caption?: string;
    fileUrls: string[];
  }
) {
  const campaignCreatorId = validateTokenSync(token);
  if (!campaignCreatorId) {
    throw new Error("Invalid portal token");
  }

  const [content] = await db
    .insert(contents)
    .values({
      campaignCreatorId,
      type: data.type,
      title: data.title,
      caption: data.caption,
      fileUrls: data.fileUrls,
      status: "pending",
    })
    .returning();

  revalidatePath(`/creator-portal/${token}`);
  return content;
}

function buildPortalUrl(campaignCreatorId: string) {
  const token = generateTokenSync(campaignCreatorId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/creator-portal/${token}`;
}

export async function getPortalUrl(campaignCreatorId: string) {
  return buildPortalUrl(campaignCreatorId);
}

export async function getPortalUrlsForBrandCreators(brandCreatorIds: string[]) {
  if (brandCreatorIds.length === 0) {
    return {} as Record<string, string>;
  }

  const rows = await db
    .select({
      id: campaignCreators.id,
      brandCreatorId: campaignCreators.brandCreatorId,
    })
    .from(campaignCreators)
    .where(inArray(campaignCreators.brandCreatorId, brandCreatorIds));

  return rows.reduce<Record<string, string>>((urls, row) => {
    urls[row.brandCreatorId] = buildPortalUrl(row.id);
    return urls;
  }, {});
}
