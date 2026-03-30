import Anthropic from "@anthropic-ai/sdk";
import type { BrandAnalysis } from "@/lib/db/schema";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type OutreachContext = {
  brand: {
    name: string;
    analysis: BrandAnalysis | null | undefined;
  };
  creator: {
    name: string;
    bio: string | null;
    platforms: {
      platformId: string;
      handle: string;
      followerCount: number | null;
    }[];
  };
};

export async function generateOutreachMessage(ctx: OutreachContext): Promise<string> {
  const { brand, creator } = ctx;

  const primaryPlatform = creator.platforms[0];
  const platformSummary = creator.platforms
    .map((p) => {
      const parts = [p.platformId, `@${p.handle}`];
      if (p.followerCount) parts.push(`${(p.followerCount / 1000).toFixed(0)}k followers`);
      return parts.join(" ");
    })
    .join(", ");

  const brandContext = brand.analysis
    ? [
        `Niche: ${brand.analysis.niche}`,
        `Tone: ${brand.analysis.toneOfVoice}`,
        `Target audience: ${brand.analysis.targetAudience}`,
      ].join("\n")
    : `Brand: ${brand.name}`;

  const prompt = `You are writing a first-contact outreach DM from a brand to a creator for a potential partnership.

BRAND:
Name: ${brand.name}
${brandContext}

CREATOR:
Name: ${creator.name}
${creator.bio ? `Bio: ${creator.bio}` : ""}
Platforms: ${platformSummary || "not listed"}

Write a short, personalized outreach DM (3–5 sentences). Requirements:
- Address the creator by first name
- Reference something specific about their content or platform presence (use their bio or platform info)
- Briefly introduce the brand and why there's a natural fit
- End with a clear, low-pressure call to action (e.g. "Would love to share more details if you're open to it")
- Tone must match the brand: ${brand.analysis?.toneOfVoice ?? "professional and friendly"}
- Write in plain text, no subject line, no sign-off, no placeholders in brackets
- Do NOT use generic phrases like "I came across your profile" or "I love your content"

Return ONLY the message text. Nothing else.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return text.trim();
}
