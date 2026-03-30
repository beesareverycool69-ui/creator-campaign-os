"use server";

import { db } from "@/lib/db";
import {
  shipments,
  shipmentItems,
  campaignCreators,
  addresses,
  products,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// =============================================================================
// TYPES
// =============================================================================
export type ShipmentStatus =
  | "pending"
  | "preparing"
  | "on_hold"
  | "label_created"
  | "shipped"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed_attempt"
  | "exception"
  | "returned"
  | "lost"
  | "cancelled";

export type CreateShipmentInput = {
  campaignCreatorId: string;
  addressId: string;
  items?: { productId: string; quantity: number }[];
  carrier?: string;
  notes?: string;
};

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get shipment for a campaign creator
 */
export async function getShipment(campaignCreatorId: string) {
  const result = await db.query.shipments.findFirst({
    where: eq(shipments.campaignCreatorId, campaignCreatorId),
    with: {
      address: true,
      items: {
        with: {
          product: true,
        },
      },
    },
  });

  return result;
}

/**
 * Get shipment by ID with related data
 */
export async function getShipmentById(id: string) {
  const result = await db.query.shipments.findFirst({
    where: eq(shipments.id, id),
    with: {
      address: true,
      items: {
        with: {
          product: true,
        },
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
              creator: true,
            },
          },
        },
      },
    },
  });

  return result;
}

/**
 * Get creator's addresses for shipment form
 */
export async function getCreatorAddresses(creatorId: string) {
  const result = await db.query.addresses.findMany({
    where: eq(addresses.creatorId, creatorId),
    orderBy: (addresses, { desc }) => [desc(addresses.isDefault)],
  });

  return result;
}

/**
 * Get brand's products for shipment form
 */
export async function getBrandProducts(brandId: string) {
  const result = await db.query.products.findMany({
    where: and(eq(products.brandId, brandId), eq(products.isActive, true)),
    orderBy: (products, { asc }) => [asc(products.name)],
  });

  return result;
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new shipment
 */
export async function createShipment(input: CreateShipmentInput) {
  // Check if shipment already exists
  const existing = await getShipment(input.campaignCreatorId);
  if (existing) {
    throw new Error("Shipment already exists for this campaign creator");
  }

  // Create shipment
  const [newShipment] = await db
    .insert(shipments)
    .values({
      campaignCreatorId: input.campaignCreatorId,
      addressId: input.addressId,
      carrier: input.carrier || null,
      notes: input.notes || null,
      status: "pending",
    })
    .returning();

  // Create shipment items if provided
  if (input.items && input.items.length > 0) {
    await db.insert(shipmentItems).values(
      input.items.map((item) => ({
        shipmentId: newShipment.id,
        productId: item.productId,
        quantity: item.quantity,
      }))
    );
  }

  // Get campaign ID for revalidation
  const cc = await db.query.campaignCreators.findFirst({
    where: eq(campaignCreators.id, input.campaignCreatorId),
    columns: { campaignId: true },
  });

  if (cc) {
    revalidatePath(`/campaigns/${cc.campaignId}/creators/${input.campaignCreatorId}`);
  }

  return newShipment;
}

/**
 * Update shipment status
 */
export async function updateShipmentStatus(id: string, status: ShipmentStatus) {
  const now = new Date();

  const updateData: Record<string, any> = {
    status,
    updatedAt: now,
  };

  // Set timestamps based on status
  switch (status) {
    case "shipped":
      updateData.shippedAt = now;
      break;
    case "delivered":
      updateData.deliveredAt = now;
      break;
  }

  const [updated] = await db
    .update(shipments)
    .set(updateData)
    .where(eq(shipments.id, id))
    .returning();

  // Get campaign creator for revalidation
  const cc = await db.query.campaignCreators.findFirst({
    where: eq(campaignCreators.id, updated.campaignCreatorId),
    columns: { campaignId: true },
  });

  if (cc) {
    revalidatePath(`/campaigns/${cc.campaignId}/creators/${updated.campaignCreatorId}`);
    revalidatePath(`/campaigns/${cc.campaignId}/creators/${updated.campaignCreatorId}/shipment`);
  }

  return updated;
}

/**
 * Update tracking info
 */
export async function updateTrackingInfo(
  id: string,
  trackingNumber: string,
  carrier: string
) {
  // Generate tracking URL based on carrier
  const trackingUrl = getTrackingUrl(carrier, trackingNumber);

  const [updated] = await db
    .update(shipments)
    .set({
      trackingNumber,
      carrier,
      trackingUrl,
      updatedAt: new Date(),
    })
    .where(eq(shipments.id, id))
    .returning();

  // Get campaign creator for revalidation
  const cc = await db.query.campaignCreators.findFirst({
    where: eq(campaignCreators.id, updated.campaignCreatorId),
    columns: { campaignId: true },
  });

  if (cc) {
    revalidatePath(`/campaigns/${cc.campaignId}/creators/${updated.campaignCreatorId}`);
    revalidatePath(`/campaigns/${cc.campaignId}/creators/${updated.campaignCreatorId}/shipment`);
  }

  return updated;
}

// =============================================================================
// HELPERS
// =============================================================================

function getTrackingUrl(carrier: string, trackingNumber: string): string | null {
  const urls: Record<string, string> = {
    usps: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
    fedex: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    ups: `https://www.ups.com/track?tracknum=${trackingNumber}`,
    dhl: `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingNumber}`,
  };

  return urls[carrier.toLowerCase()] || null;
}
