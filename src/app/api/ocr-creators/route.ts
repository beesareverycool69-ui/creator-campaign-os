import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File;
    const brandId = formData.get("brandId") as string;

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");

    // Determine media type
    let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" =
      "image/png";
    if (image.type === "image/jpeg" || image.type === "image/jpg") {
      mediaType = "image/jpeg";
    } else if (image.type === "image/gif") {
      mediaType = "image/gif";
    } else if (image.type === "image/webp") {
      mediaType = "image/webp";
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: `Extract all social media creator handles/usernames visible in this screenshot.

For each creator found, identify:
- Their username/handle
- The platform (instagram, tiktok, youtube, twitter)
- Their display name if visible
- Their follower count if visible

Respond ONLY with valid JSON array, no other text:
[
  {
    "handle": "username",
    "platform": "instagram",
    "name": "Display Name",
    "followers": "50K"
  }
]

If no creators are found, return an empty array: []`,
            },
          ],
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
      return NextResponse.json({ creators: [] });
    }

    const creators = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ creators });
  } catch (error) {
    console.error("OCR error:", error);
    return NextResponse.json(
      { error: "Failed to process screenshot" },
      { status: 500 }
    );
  }
}
