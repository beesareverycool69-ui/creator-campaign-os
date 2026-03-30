import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { BrandProfile, SearchKeywords, DiscoveredCreator, ScoredCreator } from "@/lib/types/discovery";

const client = new Anthropic();

/**
 * Step 4: Scoring
 * Score all creators (from database + discovered) against brand profile
 * Returns top 20 ranked by fit score
 */
export async function POST(request: NextRequest) {
  try {
    const { profile, keywords, database_creators, discovered_creators } = await request.json() as {
      profile: BrandProfile;
      keywords: SearchKeywords;
      database_creators: any[];
      discovered_creators: DiscoveredCreator[];
    };

    if (!profile) {
      return NextResponse.json(
        { error: "Brand profile is required" },
        { status: 400 }
      );
    }

    // Combine all creators (limit to prevent token overflow)
    const dbCreators = (database_creators || []).slice(0, 20);
    const webCreators = (discovered_creators || []).slice(0, 30);
    
    const allCreators = [
      ...dbCreators.map((c: any) => ({
        name: c.name,
        handle: c.platforms?.[0]?.handle || c.handle || "unknown",
        platform: c.platforms?.[0]?.platformId || c.primaryPlatform || "unknown",
        profile_url: c.platforms?.[0]?.profileUrl || "",
        follower_count: c.platforms?.[0]?.followerCount?.toString() || "unknown",
        bio: c.bio || "",
        source: "database",
      })),
      ...webCreators.map((c) => ({
        name: c.name,
        handle: c.handle,
        platform: c.platform,
        profile_url: c.profile_url,
        follower_count: c.follower_count,
        niche: c.niche,
        content_style: c.content_style,
        why_good_fit: c.why_good_fit,
        source: "discovered",
      })),
    ];

    if (allCreators.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        creators: [],
      });
    }

    // Call Claude to score all creators - NO tools needed
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Score these creators for brand fit. Be critical and precise.

BRAND PROFILE:
- Name: ${profile.brand_name}
- Industry: ${profile.industry}
- Sub-niche: ${profile.sub_niche}
- Target Audience: ${profile.target_audience.age_range}, ${profile.target_audience.gender_skew}, interests: ${profile.target_audience.interests.join(", ")}
- Brand Tone: ${profile.brand_tone.join(", ")}
- Brand Values: ${profile.brand_values.join(", ")}
- Content Themes: ${profile.content_themes.join(", ")}

KEYWORDS:
- Niche: ${keywords?.niche_keywords?.join(", ") || "N/A"}
- Audience: ${keywords?.audience_keywords?.join(", ") || "N/A"}

CREATORS TO SCORE:
${JSON.stringify(allCreators, null, 2)}

Score each creator 0-100 based on:
- Niche alignment (30-40% weight)
- Audience overlap (20-30% weight)
- Tone/values match (15-20% weight)
- Content format fit (10-15% weight)
- Size appropriateness for brand (5-10% weight)

Return ONLY a valid JSON array sorted by score descending, TOP 20 max (no markdown, no explanation):
[
  {
    "name": "Creator name",
    "handle": "username",
    "platform": "platform",
    "profile_url": "url",
    "follower_count": "count",
    "score": 85,
    "reasoning": "2-3 sentences explaining the score - what fits and what doesn't",
    "suggested_collab_type": "e.g., product review, tutorial, brand ambassador",
    "source": "database" or "discovered"
  }
]`,
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

    const cleaned = textBlock.text
      .replace(/^```(?:json)?\n?/gm, "")
      .replace(/\n?```$/gm, "")
      .trim();

    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No JSON array in scoring response:", cleaned.slice(0, 500));
      return NextResponse.json(
        { error: "Could not parse scored creators" },
        { status: 500 }
      );
    }

    const scoredCreators = JSON.parse(jsonMatch[0]) as ScoredCreator[];

    // Ensure sorted by score
    scoredCreators.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      count: scoredCreators.length,
      creators: scoredCreators.slice(0, 20),
      total_evaluated: allCreators.length,
    });
  } catch (error) {
    console.error("Scoring error:", error);

    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Anthropic API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scoring failed" },
      { status: 500 }
    );
  }
}
