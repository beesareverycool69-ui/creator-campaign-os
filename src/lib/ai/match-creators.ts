import Anthropic from "@anthropic-ai/sdk";
import type { BrandAnalysis } from "@/lib/db/schema";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type CreatorForMatching = {
  id: string;
  name: string;
  bio: string | null;
  country: string | null;
  platforms: {
    platformId: string;
    followerCount: number | null;
    engagementRate: string | null;
  }[];
};

export type CreatorMatchResult = {
  creatorId: string;
  fitScore: number;
  reason: string;
};

export async function matchCreators(
  brandAnalysis: BrandAnalysis,
  creators: CreatorForMatching[]
): Promise<CreatorMatchResult[]> {
  if (creators.length === 0) return [];

  const creatorProfiles = creators
    .map((c) => {
      const platformSummary = c.platforms
        .map((p) => {
          const parts = [p.platformId];
          if (p.followerCount) parts.push(`${p.followerCount.toLocaleString()} followers`);
          if (p.engagementRate) parts.push(`${p.engagementRate}% engagement`);
          return parts.join(", ");
        })
        .join(" | ");

      return [
        `ID: ${c.id}`,
        `Name: ${c.name}`,
        c.bio ? `Bio: ${c.bio}` : null,
        c.country ? `Location: ${c.country}` : null,
        platformSummary ? `Platforms: ${platformSummary}` : "Platforms: none listed",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");

  const prompt = `You are scoring creators for brand fit. Be precise and critical — not every creator is a good fit.

BRAND IDEAL CREATOR PROFILE:
- Niche: ${brandAnalysis.niche}
- Tone: ${brandAnalysis.toneOfVoice}
- Target audience: ${brandAnalysis.targetAudience}
- Ideal creator niche: ${brandAnalysis.idealCreatorProfile.niche}
- Ideal content style: ${brandAnalysis.idealCreatorProfile.contentStyle}
- Ideal platforms: ${brandAnalysis.idealCreatorProfile.platforms.join(", ")}
- Ideal follower range: ${brandAnalysis.idealCreatorProfile.followerRange.min.toLocaleString()} – ${brandAnalysis.idealCreatorProfile.followerRange.max.toLocaleString()}

CREATORS TO SCORE:
${creatorProfiles}

Score each creator from 0–100 for fit with this brand. Consider:
- Niche/content alignment (most important)
- Platform match
- Follower count vs ideal range
- Tone and audience alignment from bio

Return ONLY a valid JSON array — no markdown, no explanation:
[
  {
    "creatorId": "<exact id from above>",
    "fitScore": <0-100>,
    "reason": "<1-2 sentences: specific reasons for score, mention what fits and what doesn't>"
  }
]

Order by fitScore descending. Include ALL creators even if score is low.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  const cleaned = text
    .replace(/^```(?:json)?\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim();

  let parsed: CreatorMatchResult[];
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }

  return parsed;
}
