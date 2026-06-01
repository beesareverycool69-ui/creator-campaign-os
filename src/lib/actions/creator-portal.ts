"use server";

import { db } from "@/lib/db";
import { campaignCreators, contents } from "@/lib/db/schema";
import { brandCreators, brands } from "@/lib/db/schema";
import { addresses, creators } from "@/lib/db/schema";
import { campaigns } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { generatePortalToken, validatePortalToken } from "@/lib/creator-portal/tokens";

export type PortalShippingAddressInput = {
  recipientName: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
};

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

  const creatorAddresses = await db
    .select()
    .from(addresses)
    .where(eq(addresses.creatorId, result.creator.id));

  const shippingAddress =
    creatorAddresses.find((address) => address.isDefault) || creatorAddresses[0] || null;

  return {
    ...result,
    contents: contentList,
    shippingAddress,
  };
}

export async function savePortalShippingAddress(
  token: string,
  input: PortalShippingAddressInput
) {
  const campaignCreatorId = validatePortalToken(token);
  if (!campaignCreatorId) {
    throw new Error("Invalid portal token");
  }

  const [result] = await db
    .select({
      creatorId: brandCreators.creatorId,
      campaignId: campaignCreators.campaignId,
    })
    .from(campaignCreators)
    .innerJoin(brandCreators, eq(campaignCreators.brandCreatorId, brandCreators.id))
    .where(eq(campaignCreators.id, campaignCreatorId))
    .limit(1);

  if (!result) {
    throw new Error("Invalid portal token");
  }

  const address = validateShippingAddress(input);

  const creatorAddresses = await db
    .select({ id: addresses.id, isDefault: addresses.isDefault })
    .from(addresses)
    .where(eq(addresses.creatorId, result.creatorId));

  const existingAddress =
    creatorAddresses.find((existing) => existing.isDefault) || creatorAddresses[0] || null;

  if (existingAddress) {
    const [updated] = await db
      .update(addresses)
      .set({
        ...address,
        label: "Shipping",
        isDefault: true,
        updatedAt: new Date(),
      })
      .where(eq(addresses.id, existingAddress.id))
      .returning();

    revalidatePath(`/creator-portal/${token}`);
    revalidatePath(`/campaigns/${result.campaignId}/creators/${campaignCreatorId}/shipment`);
    return updated;
  }

  const [created] = await db
    .insert(addresses)
    .values({
      creatorId: result.creatorId,
      label: "Shipping",
      ...address,
      isDefault: true,
    })
    .returning();

  revalidatePath(`/creator-portal/${token}`);
  revalidatePath(`/campaigns/${result.campaignId}/creators/${campaignCreatorId}/shipment`);
  return created;
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

function validateShippingAddress(input: PortalShippingAddressInput) {
  const recipientName = required(input.recipientName, "Recipient name");
  const street1 = required(input.street1, "Street address");
  const city = required(input.city, "City");
  const state = required(input.state, "State/region");
  const postalCode = required(input.postalCode, "Postal code");
  const country = required(input.country, "Country").toUpperCase();

  if (country.length < 2 || country.length > 100) {
    throw new Error("Country is required");
  }

  return {
    recipientName,
    street1,
    street2: cleanOptional(input.street2),
    city,
    state,
    postalCode,
    country,
    phone: cleanOptional(input.phone),
  };
}

function required(value: string | undefined, label: string) {
  const cleaned = value?.trim();
  if (!cleaned) {
    throw new Error(`${label} is required`);
  }
  return cleaned;
}

function cleanOptional(value: string | undefined) {
  const cleaned = value?.trim();
  return cleaned || null;
}
