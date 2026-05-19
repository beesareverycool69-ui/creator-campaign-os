import { NextRequest, NextResponse } from "next/server";
import { requireDiscoveryApiAccess } from "@/lib/api/discovery-auth";
import Anthropic from "@anthropic-ai/sdk";
import type { BrandProfile, SearchKeywords, DiscoveredCreator } from "@/lib/types/discovery";

const client = new Anthropic();

type Platform = "instagram" | "tiktok" | "youtube" | "x_twitter";

/**
 * Step 3b: Web Discovery (Track B)
 * Run 4 Claude API calls in parallel - one per platform
 * Each uses web_search to find real creators
 */
async function discoverForPlatform(
  platform: Platform,
  brandProfile: BrandProfile,
  searchQueries: string[]
): Promise<DiscoveredCreator[]> {
  const platformNames: Record<Platform, string> = {
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    x_twitter: "X (Twitter)",
  };

  const platformName = platformNames[platform];

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 8,
        },
      ],
      messages: [
        {
          role: "user",
          content: `Find ${platformName} influencers/creators who would be great partners for this brand:

BRAND: ${brandProfile.brand_name}
INDUSTRY: ${brandProfile.industry}
SUB-NICHE: ${brandProfile.sub_niche}
TARGET AUDIENCE: ${brandProfile.target_audience.age_range}, ${brandProfile.target_audience.gender_skew}, interests: ${brandProfile.target_audience.interests.join(", ")}
BRAND TONE: ${brandProfile.brand_tone.join(", ")}

SEARCH QUERIES TO USE:
${searchQueries.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Search for real ${platformName} creators matching this brand. Prioritize:
- Creators with 10K-500K followers (micro to mid-tier)
- Active accounts with recent content
- Content style that matches the brand tone
- Authentic engagement, not just high follower counts

Return ONLY a valid JSON array with 5-10 creators (no markdown, no explanation):
[
  {
    "name": "Creator's display name",
    "handle": "username without @",
    "platform": "${platform}",
    "profile_url": "full URL to profile",
    "follower_count": "formatted like 50K or 1.2M",
    "niche": "their content niche",
    "content_style": "how they create content",
    "why_good_fit": "2-3 sentences on why they match this brand",
    "source": "discovered"
  }
]

Only include creators you found evidence of through search. Do not make up profiles.`,
        },
      ],
    });

    // Extract text blocks (Claude returns multiple when using tools)
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    if (textBlocks.length === 0) {
      console.log(`No text response for ${platform}`);
      return [];
    }

    const fullText = textBlocks.map((b) => b.text).join("\n");
    const cleaned = fullText
      .replace(/^```(?:json)?\n?/gm, "")
      .replace(/\n?```$/gm, "")
      .trim();

    // Find JSON array
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.log(`No JSON array found for ${platform}:`, cleaned.slice(0, 200));
      return [];
    }

    const creators = JSON.parse(jsonMatch[0]) as DiscoveredCreator[];
    return creators.map((c) => ({ ...c, platform, source: "discovered" }));
  } catch (error) {
    console.error(`Discovery failed for ${platform}:`, error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile, keywords, brandId } = await request.json() as {
      profile: BrandProfile;
      keywords: SearchKeywords;
      brandId?: string;
    };

    const authError = await requireDiscoveryApiAccess(brandId);
    if (authError) return authError;

    if (!profile || !keywords) {
      return NextResponse.json(
        { error: "Brand profile and keywords are required" },
        { status: 400 }
      );
    }

    // Run all 4 platform discoveries in parallel
    const platforms: Platform[] = ["instagram", "tiktok", "youtube", "x_twitter"];
    
    const discoveries = await Promise.all(
      platforms.map((platform) =>
        discoverForPlatform(
          platform,
          profile,
          keywords.search_queries[platform] || []
        )
      )
    );

    // Flatten results
    const allCreators = discoveries.flat();

    // Deduplicate by handle (case-insensitive)
    const seen = new Set<string>();
    const uniqueCreators = allCreators.filter((c) => {
      const key = `${c.handle.toLowerCase()}-${c.platform}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({
      success: true,
      count: uniqueCreators.length,
      creators: uniqueCreators,
      by_platform: {
        instagram: discoveries[0].length,
        tiktok: discoveries[1].length,
        youtube: discoveries[2].length,
        x_twitter: discoveries[3].length,
      },
    });
  } catch (error) {
    console.error("Discovery error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Discovery failed" },
      { status: 500 }
    );
  }
}
