import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { affiliateConversions, campaignCreators } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isProduction, verifyHexHmacSignature } from "@/lib/webhooks/signatures";

// Webhook secret for validating requests (set in env)
const WEBHOOK_SECRET = process.env.CONVERSION_WEBHOOK_SECRET;

/**
 * Webhook endpoint for stores to report affiliate conversions
 * 
 * Expected payload:
 * {
 *   order_id: string,
 *   order_value: number,
 *   currency: string,
 *   promo_code: string,        // The affiliate code used
 *   converted_at?: string,     // ISO timestamp
 * }
 * 
 * Headers:
 *   X-Webhook-Signature: HMAC-SHA256 signature of body (optional but recommended)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    const signature = request.headers.get("X-Webhook-Signature");

    if (isProduction() && !WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Webhook secret is not configured" },
        { status: 500 }
      );
    }

    // Validate webhook signature if secret is configured. In production,
    // the secret and signature are required before any processing.
    if (WEBHOOK_SECRET) {
      if (!signature) {
        return NextResponse.json(
          { error: "Missing signature" },
          { status: 401 }
        );
      }

      if (!verifyHexHmacSignature(body, signature, WEBHOOK_SECRET)) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    const payload = JSON.parse(body);
    
    const {
      order_id,
      order_value,
      currency = "USD",
      promo_code,
      converted_at,
    } = payload;

    if (!order_id || !order_value || !promo_code) {
      return NextResponse.json(
        { error: "Missing required fields: order_id, order_value, promo_code" },
        { status: 400 }
      );
    }

    // Find the campaign creator by affiliate code
    const [campaignCreator] = await db
      .select()
      .from(campaignCreators)
      .where(eq(campaignCreators.affiliateCode, promo_code.toUpperCase()))
      .limit(1);

    if (!campaignCreator) {
      return NextResponse.json(
        { error: "Unknown promo code", promo_code },
        { status: 404 }
      );
    }

    // Calculate commission
    const affiliateRate = campaignCreator.affiliateRate 
      ? parseFloat(campaignCreator.affiliateRate) 
      : 10; // Default 10% if not set
    const commission = (parseFloat(order_value) * affiliateRate) / 100;

    // Check for duplicate order
    const [existing] = await db
      .select()
      .from(affiliateConversions)
      .where(eq(affiliateConversions.orderId, order_id))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { message: "Conversion already recorded", conversion_id: existing.id },
        { status: 200 }
      );
    }

    // Record the conversion
    const [conversion] = await db
      .insert(affiliateConversions)
      .values({
        campaignCreatorId: campaignCreator.id,
        orderId: order_id,
        orderValue: order_value.toString(),
        commission: commission.toFixed(2),
        currency,
        status: "pending",
        convertedAt: converted_at ? new Date(converted_at) : new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      conversion_id: conversion.id,
      commission: commission.toFixed(2),
      currency,
      creator_id: campaignCreator.id,
    });
  } catch (error) {
    console.error("Conversion webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process conversion" },
      { status: 500 }
    );
  }
}

// Also support GET for testing/verification
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "Conversion webhook",
    usage: {
      method: "POST",
      body: {
        order_id: "string (required)",
        order_value: "number (required)",
        promo_code: "string (required)",
        currency: "string (default: USD)",
        converted_at: "ISO timestamp (optional)",
      },
      headers: {
        "X-Webhook-Signature": "HMAC-SHA256 of body (optional)",
      },
    },
  });
}
