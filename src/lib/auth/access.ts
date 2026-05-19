import { db } from "@/lib/db";
import {
  agreements,
  brandCreators,
  brands,
  campaignCreators,
  campaigns,
  contents,
  shipments,
} from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { and, eq } from "drizzle-orm";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Authentication required");
  }

  return user;
}

export async function requireOwnedBrand(brandId: string) {
  const user = await requireUser();

  const [brand] = await db
    .select()
    .from(brands)
    .where(and(eq(brands.id, brandId), eq(brands.userId, user.id)))
    .limit(1);

  if (!brand) {
    throw new Error("Brand not found");
  }

  return brand;
}

export async function requireOwnedBrandCreator(brandCreatorId: string) {
  const user = await requireUser();

  const [brandCreator] = await db
    .select({
      id: brandCreators.id,
      brandId: brandCreators.brandId,
      creatorId: brandCreators.creatorId,
      status: brandCreators.status,
      notes: brandCreators.notes,
      firstContactedAt: brandCreators.firstContactedAt,
    })
    .from(brandCreators)
    .innerJoin(brands, eq(brandCreators.brandId, brands.id))
    .where(and(eq(brandCreators.id, brandCreatorId), eq(brands.userId, user.id)))
    .limit(1);

  if (!brandCreator) {
    throw new Error("Record not found");
  }

  return brandCreator;
}

export async function requireOwnedCampaign(campaignId: string) {
  const user = await requireUser();

  const [campaign] = await db
    .select({ id: campaigns.id, brandId: campaigns.brandId })
    .from(campaigns)
    .innerJoin(brands, eq(campaigns.brandId, brands.id))
    .where(and(eq(campaigns.id, campaignId), eq(brands.userId, user.id)))
    .limit(1);

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  return campaign;
}

export async function requireOwnedCampaignCreator(campaignCreatorId: string) {
  const user = await requireUser();

  const [campaignCreator] = await db
    .select({
      id: campaignCreators.id,
      campaignId: campaignCreators.campaignId,
      brandCreatorId: campaignCreators.brandCreatorId,
    })
    .from(campaignCreators)
    .innerJoin(campaigns, eq(campaignCreators.campaignId, campaigns.id))
    .innerJoin(brands, eq(campaigns.brandId, brands.id))
    .where(and(eq(campaignCreators.id, campaignCreatorId), eq(brands.userId, user.id)))
    .limit(1);

  if (!campaignCreator) {
    throw new Error("Record not found");
  }

  return campaignCreator;
}

export async function requireOwnedAgreement(agreementId: string) {
  const user = await requireUser();

  const [agreement] = await db
    .select({ id: agreements.id, campaignCreatorId: agreements.campaignCreatorId })
    .from(agreements)
    .innerJoin(campaignCreators, eq(agreements.campaignCreatorId, campaignCreators.id))
    .innerJoin(campaigns, eq(campaignCreators.campaignId, campaigns.id))
    .innerJoin(brands, eq(campaigns.brandId, brands.id))
    .where(and(eq(agreements.id, agreementId), eq(brands.userId, user.id)))
    .limit(1);

  if (!agreement) {
    throw new Error("Agreement not found");
  }

  return agreement;
}

export async function requireOwnedShipment(shipmentId: string) {
  const user = await requireUser();

  const [shipment] = await db
    .select({ id: shipments.id, campaignCreatorId: shipments.campaignCreatorId })
    .from(shipments)
    .innerJoin(campaignCreators, eq(shipments.campaignCreatorId, campaignCreators.id))
    .innerJoin(campaigns, eq(campaignCreators.campaignId, campaigns.id))
    .innerJoin(brands, eq(campaigns.brandId, brands.id))
    .where(and(eq(shipments.id, shipmentId), eq(brands.userId, user.id)))
    .limit(1);

  if (!shipment) {
    throw new Error("Shipment not found");
  }

  return shipment;
}

export async function requireOwnedContent(contentId: string) {
  const user = await requireUser();

  const [content] = await db
    .select({ id: contents.id, campaignCreatorId: contents.campaignCreatorId })
    .from(contents)
    .innerJoin(campaignCreators, eq(contents.campaignCreatorId, campaignCreators.id))
    .innerJoin(campaigns, eq(campaignCreators.campaignId, campaigns.id))
    .innerJoin(brands, eq(campaigns.brandId, brands.id))
    .where(and(eq(contents.id, contentId), eq(brands.userId, user.id)))
    .limit(1);

  if (!content) {
    throw new Error("Content not found");
  }

  return content;
}
