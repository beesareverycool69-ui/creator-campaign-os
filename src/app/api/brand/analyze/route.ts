import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { BrandProfile } from "@/lib/types/discovery";

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Call Claude with web_search tool enabled
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 3,
        },
      ],
      messages: [
        {
          role: "user",
          content: `Visit this website and analyze the brand: ${url}

Extract a comprehensive brand profile by visiting the site and analyzing their content, messaging, products, and positioning.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):

{
  "brand_name": "The official brand name",
  "industry": "Primary industry category",
  "sub_niche": "Specific niche within the industry",
  "products_or_services": ["array", "of", "main", "offerings"],
  "target_audience": {
    "age_range": "e.g. 25-45",
    "gender_skew": "e.g. female-leaning, neutral, male-leaning",
    "interests": ["array", "of", "interests"],
    "income_level": "e.g. middle-income, affluent"
  },
  "brand_tone": ["array", "of", "tone", "descriptors"],
  "brand_values": ["array", "of", "core", "values"],
  "content_themes": ["array", "of", "content", "themes", "they", "use"],
  "competitors": ["array", "of", "likely", "competitors"]
}

If the URL is blocked or inaccessible, search for the brand name instead and build the profile from available information.`,
        },
      ],
    });

    // Extract text content from response (Claude returns multiple blocks when using tools)
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    if (textBlocks.length === 0) {
      return NextResponse.json(
        { error: "No text response from Claude" },
        { status: 500 }
      );
    }

    // Join all text blocks and extract JSON
    const fullText = textBlocks.map((b) => b.text).join("\n");

    // Strip markdown code fences if present
    const cleaned = fullText
      .replace(/^```(?:json)?\n?/gm, "")
      .replace(/\n?```$/gm, "")
      .trim();

    // Find the JSON object in the response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", cleaned.slice(0, 500));
      return NextResponse.json(
        { error: "Could not parse brand profile from response" },
        { status: 500 }
      );
    }

    let brandProfile: BrandProfile;
    try {
      brandProfile = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, jsonMatch[0].slice(0, 500));
      return NextResponse.json(
        { error: "Invalid JSON in response" },
        { status: 500 }
      );
    }

    // Validate required fields
    if (!brandProfile.brand_name || !brandProfile.industry) {
      return NextResponse.json(
        { error: "Incomplete brand profile returned", profile: brandProfile },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: brandProfile,
      url,
    });
  } catch (error) {
    console.error("Brand analysis error:", error);
    
    // Handle specific Anthropic errors
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Anthropic API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Brand analysis failed" },
      { status: 500 }
    );
  }
}
