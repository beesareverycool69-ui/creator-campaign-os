import { NextRequest, NextResponse } from "next/server";
import { discoverCreators, type DiscoveryParams } from "@/lib/ai/discover-external";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      keywords,
      platform = "all",
      location,
      minFollowers,
      maxFollowers,
      limit = 10,
    } = body as Partial<DiscoveryParams> & { keywords?: string };

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

    return NextResponse.json({
      success: true,
      count: creators.length,
      creators,
    });
  } catch (error) {
    console.error("External discovery error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Discovery failed" },
      { status: 500 }
    );
  }
}
