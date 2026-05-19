import { NextRequest, NextResponse } from "next/server";
import { requireDiscoveryApiAccess } from "@/lib/api/discovery-auth";
import Anthropic from "@anthropic-ai/sdk";
import type { BrandProfile, SearchKeywords } from "@/lib/types/discovery";

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { profile, brandId } = await request.json() as { profile: BrandProfile; brandId?: string };

    const authError = await requireDiscoveryApiAccess(brandId);
    if (authError) return authError;

    if (!profile || !profile.brand_name) {
      return NextResponse.json(
        { error: "Brand profile is required" },
        { status: 400 }
      );
    }

    // Call Claude to generate keywords - NO tools needed
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Based on this brand profile, generate search keywords for finding matching influencers/creators.

BRAND PROFILE:
${JSON.stringify(profile, null, 2)}

Generate keywords and search queries optimized for finding creators who would be great brand partners.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):

{
  "niche_keywords": ["5-8 niche terms like 'clean beauty', 'skincare routine', 'minimalist makeup'"],
  "audience_keywords": ["3-5 audience descriptors like 'Gen Z beauty', 'millennial skincare enthusiasts'"],
  "content_style_keywords": ["3-5 content style terms like 'tutorials', 'get ready with me', 'reviews'"],
  "hashtags": ["5-8 hashtags WITHOUT the # symbol"],
  "search_queries": {
    "instagram": ["3 ready-to-search queries for Instagram creators"],
    "tiktok": ["3 ready-to-search queries for TikTok creators"],
    "youtube": ["3 ready-to-search queries for YouTube creators"],
    "x_twitter": ["3 ready-to-search queries for X/Twitter creators"]
  }
}

Make the search queries specific and effective for finding creators in the ${profile.industry} space who match the brand's ${profile.brand_tone.slice(0, 3).join(", ")} tone.`,
        },
      ],
    });

    // Extract text content
    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    if (!textBlock) {
      return NextResponse.json(
        { error: "No text response from Claude" },
        { status: 500 }
      );
    }

    // Strip markdown code fences if present
    const cleaned = textBlock.text
      .replace(/^```(?:json)?\n?/gm, "")
      .replace(/\n?```$/gm, "")
      .trim();

    // Find the JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", cleaned.slice(0, 500));
      return NextResponse.json(
        { error: "Could not parse keywords from response" },
        { status: 500 }
      );
    }

    let keywords: SearchKeywords;
    try {
      keywords = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in response" },
        { status: 500 }
      );
    }

    // Validate required fields
    if (!keywords.niche_keywords || !keywords.search_queries) {
      return NextResponse.json(
        { error: "Incomplete keywords returned", keywords },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      keywords,
      brand_name: profile.brand_name,
    });
  } catch (error) {
    console.error("Keyword generation error:", error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Anthropic API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Keyword generation failed" },
      { status: 500 }
    );
  }
}
