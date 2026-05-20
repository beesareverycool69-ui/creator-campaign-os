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

const MATCH_PARSE_ERROR = "Could not parse AI match results. Please try again.";

function extractJsonArray(text: string) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
    return cleaned;
  }

  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    return cleaned.slice(start, end + 1);
  }

  const objectStart = cleaned.indexOf("{");
  const objectEnd = cleaned.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
    return cleaned.slice(objectStart, objectEnd + 1);
  }

  throw new Error(MATCH_PARSE_ERROR);
}

function validateMatchResults(value: unknown): CreatorMatchResult[] {
  const maybeArray = Array.isArray(value)
    ? value
    : value &&
        typeof value === "object" &&
        "matches" in value &&
        Array.isArray((value as { matches: unknown }).matches)
      ? (value as { matches: unknown[] }).matches
      : null;

  if (!maybeArray) {
    throw new Error(MATCH_PARSE_ERROR);
  }

  return maybeArray.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error(MATCH_PARSE_ERROR);
    }

    const candidate = item as Record<string, unknown>;
    const creatorId = candidate.creatorId;
    const fitScore = candidate.fitScore;
    const reason = candidate.reason;

    if (typeof creatorId !== "string" || creatorId.length === 0) {
      throw new Error(MATCH_PARSE_ERROR);
    }
    if (typeof fitScore !== "number" || !Number.isFinite(fitScore)) {
      throw new Error(MATCH_PARSE_ERROR);
    }
    if (typeof reason !== "string" || reason.length === 0) {
      throw new Error(MATCH_PARSE_ERROR);
    }

    return {
      creatorId,
      fitScore: Math.max(0, Math.min(100, Math.round(fitScore))),
      reason,
    };
  });
}

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

Return ONLY a valid JSON array. Do not include markdown fences, comments, prose, or trailing text:
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

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonArray(text));
  } catch {
    throw new Error(MATCH_PARSE_ERROR);
  }

  return validateMatchResults(parsed);
}
