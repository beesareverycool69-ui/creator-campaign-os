// Generate unique promo codes for creators

/**
 * Generate a promo code from creator name and brand
 * Format: CREATOR_BRAND or CREATOR15 style
 */
export function generatePromoCode(
  creatorName: string,
  brandName?: string,
  style: "simple" | "with_brand" | "with_discount" = "simple"
): string {
  // Clean and uppercase the creator name
  const cleanCreator = creatorName
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 10);

  switch (style) {
    case "with_brand":
      const cleanBrand = (brandName || "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .slice(0, 6);
      return `${cleanCreator}_${cleanBrand}`;

    case "with_discount":
      // Random discount percentage style: CREATOR15, CREATOR20
      const discounts = [10, 15, 20, 25];
      const discount = discounts[Math.floor(Math.random() * discounts.length)];
      return `${cleanCreator}${discount}`;

    case "simple":
    default:
      // Add random suffix to ensure uniqueness
      const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      return `${cleanCreator}${suffix}`;
  }
}

/**
 * Generate a tracking URL with affiliate attribution
 */
export function generateTrackingUrl(
  baseUrl: string,
  affiliateCode: string,
  campaignCreatorId: string
): string {
  const url = new URL(baseUrl);
  url.searchParams.set("ref", affiliateCode);
  url.searchParams.set("utm_source", "creator");
  url.searchParams.set("utm_medium", "affiliate");
  url.searchParams.set("utm_campaign", campaignCreatorId);
  return url.toString();
}

/**
 * Parse affiliate code from various URL formats
 */
export function parseAffiliateCode(url: string): string | null {
  try {
    const parsed = new URL(url);
    return (
      parsed.searchParams.get("ref") ||
      parsed.searchParams.get("affiliate") ||
      parsed.searchParams.get("code") ||
      parsed.searchParams.get("promo") ||
      null
    );
  } catch {
    return null;
  }
}
