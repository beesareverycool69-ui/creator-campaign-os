import { NextRequest, NextResponse } from "next/server";
import { requireDiscoveryApiAccess } from "@/lib/api/discovery-auth";
import { discoverCreators, type DiscoveryParams } from "@/lib/ai/discover-external";
import { filterNewToBrandByIdentity, getBrandProcessedIdentitySet } from "@/lib/utils/brand-creator-dedupe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const authError = await requireDiscoveryApiAccess(body.brandId);
    if (authError) return authError;
    
    const {
      keywords,
      platform = "all",
      location,
      minFollowers,
      maxFollowers,
      limit = 10,
      brandId,
    } = body as Partial<DiscoveryParams> & { keywords?: string; brandId?: string };

    if (!keywords) {
      return NextResponse.json(
        { error: "Keywords are required" },
        { status: 400 }
      );
    }

    const creators = await discoverCreators({
      keywords,
      platform: platform as DiscoveryParams["platform"],
      location,
      minFollowers,
      maxFollowers,
      limit: Math.min(limit, 25), // Cap at 25 to manage API costs
    });

    const filteredCreators = brandId
      ? filterNewToBrandByIdentity(await getBrandProcessedIdentitySet(brandId), creators)
      : creators;

    return NextResponse.json({
      success: true,
      count: filteredCreators.length,
      creators: filteredCreators,
    });
  } catch (error) {
    console.error("External discovery error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Discovery failed" },
      { status: 500 }
    );
  }
}
