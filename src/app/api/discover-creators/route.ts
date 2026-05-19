import { NextRequest, NextResponse } from "next/server";
import { requireDiscoveryApiAccess } from "@/lib/api/discovery-auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { query, platform, brandId } = await request.json();

    const authError = await requireDiscoveryApiAccess(brandId);
    if (authError) return authError;

    if (!query || !platform) {
      return NextResponse.json(
        { error: "Query and platform are required" },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are helping discover ${platform} creators for influencer outreach.

Search query: "${query}"

Generate 10 realistic creator profiles that would match this search. For each creator, provide:
- A realistic handle (username) for ${platform}
- A realistic display name
- Estimated follower count (format: "10K", "1.2M", etc.)
- Their primary niche/category

Respond ONLY with valid JSON array, no other text:
[
  {
    "handle": "username",
    "platform": "${platform}",
    "name": "Display Name",
    "followers": "50K",
    "niche": "Fitness & Wellness"
  }
]

Make the profiles diverse and realistic for the ${platform} platform.`,
        },
      ],
    });

    // Extract text content
    const textContent = message.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from AI");
    }

    // Parse JSON response
    const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Could not parse creator list");
    }

    const creators = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ creators });
  } catch (error) {
    console.error("Creator discovery error:", error);
    return NextResponse.json(
      { error: "Failed to discover creators" },
      { status: 500 }
    );
  }
}
