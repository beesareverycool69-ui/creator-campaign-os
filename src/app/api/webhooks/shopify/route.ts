import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { affiliateConversions, campaignCreators } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isProduction, verifyBase64HmacSignature } from "@/lib/webhooks/signatures";

/**
 * Shopify Order Webhook Handler
 * 
 * Set up in Shopify Admin:
 * Settings → Notifications → Webhooks → Create webhook
 * Event: Order creation
 * URL: https://your-domain.com/api/webhooks/shopify
 * Format: JSON
 * 
 * Optionally set SHOPIFY_WEBHOOK_SECRET in env for verification
 */

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    const hmacHeader = request.headers.get("X-Shopify-Hmac-Sha256");

    if (isProduction() && !SHOPIFY_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Shopify webhook secret is not configured" },
        { status: 500 }
      );
    }

    // Verify Shopify signature if secret is configured. In production,
    // the secret and signature are required before any processing.
    if (SHOPIFY_WEBHOOK_SECRET) {
      if (!hmacHeader) {
        return NextResponse.json({ error: "Missing signature" }, { status: 401 });
      }

      if (!verifyBase64HmacSignature(body, hmacHeader, SHOPIFY_WEBHOOK_SECRET)) {
        console.error("Invalid Shopify webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const order = JSON.parse(body);

    // Extract promo/discount codes from the order
    const discountCodes = order.discount_codes || [];
    if (discountCodes.length === 0) {
      // No promo code used, nothing to track
      return NextResponse.json({ message: "No discount code used" }, { status: 200 });
    }

    // Process each discount code (usually just one)
    const results = [];

    for (const discount of discountCodes) {
      const promoCode = discount.code?.toUpperCase();
      if (!promoCode) continue;

      // Find the campaign creator by affiliate code
      const [campaignCreator] = await db
        .select()
        .from(campaignCreators)
        .where(eq(campaignCreators.affiliateCode, promoCode))
        .limit(1);

      if (!campaignCreator) {
        results.push({ code: promoCode, status: "unknown_code" });
        continue;
      }

      // Check for duplicate order
      const orderId = order.id?.toString() || order.order_number?.toString();
      const [existing] = await db
        .select()
        .from(affiliateConversions)
        .where(eq(affiliateConversions.orderId, orderId))
        .limit(1);

      if (existing) {
        results.push({ code: promoCode, status: "duplicate", conversion_id: existing.id });
        continue;
      }

      // Calculate order value (subtotal, excluding shipping/tax)
      const orderValue = parseFloat(order.subtotal_price || order.total_price || "0");
      const currency = order.currency || "USD";

      // Calculate commission
      const affiliateRate = campaignCreator.affiliateRate
        ? parseFloat(campaignCreator.affiliateRate)
        : 10;
      const commission = (orderValue * affiliateRate) / 100;

      // Record the conversion
      const [conversion] = await db
        .insert(affiliateConversions)
        .values({
          campaignCreatorId: campaignCreator.id,
          orderId,
          orderValue: orderValue.toFixed(2),
          commission: commission.toFixed(2),
          currency,
          status: "pending",
          convertedAt: order.created_at ? new Date(order.created_at) : new Date(),
        })
        .returning();

      results.push({
        code: promoCode,
        status: "recorded",
        conversion_id: conversion.id,
        order_value: orderValue,
        commission: commission.toFixed(2),
      });
    }

    return NextResponse.json({
      success: true,
      order_id: order.id,
      results,
    });
  } catch (error) {
    console.error("Shopify webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

// Shopify sends a test GET request when setting up webhooks
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "Shopify order webhook",
    setup: {
      location: "Shopify Admin → Settings → Notifications → Webhooks",
      event: "Order creation",
      format: "JSON",
    },
  });
}
