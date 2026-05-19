import { NextRequest, NextResponse } from "next/server";
import { requireDiscoveryApiAccess } from "@/lib/api/discovery-auth";
import type { BrandProfile, SearchKeywords, DiscoveredCreator, ScoredCreator } from "@/lib/types/discovery";

/**
 * Step 5: Main Orchestrator
 * Chains Steps 1-4: Brand Analysis → Keywords → Database + Web Discovery → Scoring
 * 
 * Input: { url: string }
 * Output: Ranked list of matching creators
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { url, brandId } = await request.json();

    const authError = await requireDiscoveryApiAccess(brandId);
    if (authError) return authError;

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const results: {
      step: string;
      duration_ms: number;
      success: boolean;
      error?: string;
    }[] = [];

    // Step 1: Brand Analysis
    console.log("Step 1: Analyzing brand...");
    const step1Start = Date.now();
    
    const analyzeRes = await fetch(`${baseUrl}/api/brand/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {}),
      },
      body: JSON.stringify({ url, brandId }),
    });
    
    const analyzeData = await analyzeRes.json();
    results.push({
      step: "brand_analysis",
      duration_ms: Date.now() - step1Start,
      success: analyzeData.success,
      error: analyzeData.error,
    });

    if (!analyzeData.success) {
      return NextResponse.json({
        success: false,
        error: `Brand analysis failed: ${analyzeData.error}`,
        results,
      }, { status: 500 });
    }

    const profile: BrandProfile = analyzeData.profile;

    // Step 2: Keyword Generation
    console.log("Step 2: Generating keywords...");
    const step2Start = Date.now();
    
    const keywordsRes = await fetch(`${baseUrl}/api/brand/keywords`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {}),
      },
      body: JSON.stringify({ profile, brandId }),
    });
    
    const keywordsData = await keywordsRes.json();
    results.push({
      step: "keyword_generation",
      duration_ms: Date.now() - step2Start,
      success: keywordsData.success,
      error: keywordsData.error,
    });

    if (!keywordsData.success) {
      return NextResponse.json({
        success: false,
        error: `Keyword generation failed: ${keywordsData.error}`,
        profile,
        results,
      }, { status: 500 });
    }

    const keywords: SearchKeywords = keywordsData.keywords;

    // Step 3a: Database Search (Track A)
    console.log("Step 3a: Searching database...");
    const step3aStart = Date.now();
    
    let databaseCreators: any[] = [];
    try {
      const matchRes = await fetch(`${baseUrl}/api/creators/match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {}),
        },
        body: JSON.stringify({ keywords, brandId }),
      });
      
      const matchData = await matchRes.json();
      databaseCreators = matchData.creators || [];
      results.push({
        step: "database_search",
        duration_ms: Date.now() - step3aStart,
        success: true,
      });
    } catch (dbError) {
      console.log("Database search skipped:", dbError);
      results.push({
        step: "database_search",
        duration_ms: Date.now() - step3aStart,
        success: true, // Graceful skip
        error: "Skipped - no matching creators in database",
      });
    }

    // Step 3b: Web Discovery (Track B)
    console.log("Step 3b: Discovering creators on web...");
    const step3bStart = Date.now();
    
    const discoverRes = await fetch(`${baseUrl}/api/creators/discover`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {}),
      },
      body: JSON.stringify({ profile, keywords, brandId }),
    });
    
    const discoverData = await discoverRes.json();
    results.push({
      step: "web_discovery",
      duration_ms: Date.now() - step3bStart,
      success: discoverData.success,
      error: discoverData.error,
    });

    const discoveredCreators: DiscoveredCreator[] = discoverData.creators || [];

    // Check if we have any creators to score
    const totalCreators = databaseCreators.length + discoveredCreators.length;
    if (totalCreators === 0) {
      return NextResponse.json({
        success: true,
        profile,
        keywords,
        creators: [],
        message: "No creators found. Try broadening your search or adding creators to your database.",
        results,
        total_duration_ms: Date.now() - startTime,
      });
    }

    // Step 4: Scoring
    console.log("Step 4: Scoring creators...");
    const step4Start = Date.now();
    
    const scoreRes = await fetch(`${baseUrl}/api/creators/score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {}),
      },
      body: JSON.stringify({
        profile,
        keywords,
        database_creators: databaseCreators,
        discovered_creators: discoveredCreators,
        brandId,
      }),
    });
    
    const scoreData = await scoreRes.json();
    results.push({
      step: "scoring",
      duration_ms: Date.now() - step4Start,
      success: scoreData.success,
      error: scoreData.error,
    });

    if (!scoreData.success) {
      // Return unscored creators if scoring fails
      return NextResponse.json({
        success: true,
        profile,
        keywords,
        creators: discoveredCreators.slice(0, 20),
        scoring_failed: true,
        results,
        total_duration_ms: Date.now() - startTime,
      });
    }

    const scoredCreators: ScoredCreator[] = scoreData.creators;

    // Success!
    return NextResponse.json({
      success: true,
      url,
      profile,
      keywords,
      creators: scoredCreators,
      stats: {
        database_matches: databaseCreators.length,
        web_discovered: discoveredCreators.length,
        total_scored: scoreData.total_evaluated,
        returned: scoredCreators.length,
      },
      results,
      total_duration_ms: Date.now() - startTime,
    });
  } catch (error) {
    console.error("Find creators error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Failed to find creators",
        total_duration_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
