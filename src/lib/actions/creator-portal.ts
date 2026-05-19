"use server";

import { db } from "@/lib/db";
import { campaignCreators, contents } from "@/lib/db/schema";
import { brandCreators, brands } from "@/lib/db/schema";
import { creators } from "@/lib/db/schema";
import { campaigns } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { generatePortalToken, validatePortalToken } from "@/lib/creator-portal/tokens";

export async function getPortalData(token: string) {
  const campaignCreatorId = validatePortalToken(token);
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
  const campaignCreatorId = validatePortalToken(token);
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
      status: "submitted",
    })
    .returning();

  const cc = await db.query.campaignCreators.findFirst({
    where: eq(campaignCreators.id, campaignCreatorId),
    columns: { campaignId: true },
  });

  revalidatePath(`/creator-portal/${token}`);
  if (cc) {
    revalidatePath(`/campaigns/${cc.campaignId}/creators/${campaignCreatorId}/content`);
    revalidatePath(`/campaigns/${cc.campaignId}/creators/${campaignCreatorId}`);
    revalidatePath(`/campaigns/${cc.campaignId}`);
  }
  return content;
}

function buildPortalUrl(campaignCreatorId: string) {
  const token = generatePortalToken(campaignCreatorId);
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
