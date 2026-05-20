import Anthropic from "@anthropic-ai/sdk";
import type { Message, Tool } from "@anthropic-ai/sdk/resources/messages";
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
const MATCH_RESULTS_TOOL_NAME = "return_creator_matches";

const matchResultsTool: Tool = {
  name: MATCH_RESULTS_TOOL_NAME,
  description: "Return creator brand-fit scores as structured data.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      matches: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            creatorId: { type: "string" },
            fitScore: { type: "number", minimum: 0, maximum: 100 },
            reason: { type: "string" },
          },
          required: ["creatorId", "fitScore", "reason"],
        },
      },
    },
    required: ["matches"],
  },
};

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

function validateMatchResults(value: unknown, validCreatorIds: Set<string>): CreatorMatchResult[] {
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

    if (typeof creatorId !== "string" || creatorId.length === 0 || !validCreatorIds.has(creatorId)) {
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

type ClaudeMessage = Message;

function getToolInput(message: ClaudeMessage) {
  const toolUse = message.content.find(
    (block) => block.type === "tool_use" && block.name === MATCH_RESULTS_TOOL_NAME
  );

  return toolUse?.type === "tool_use" ? toolUse.input : null;
}

function getTextContent(message: ClaudeMessage) {
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n")
    .trim();
}

function parseMatchResponse(message: ClaudeMessage, validCreatorIds: Set<string>) {
  const toolInput = getToolInput(message);
  if (toolInput) {
    return validateMatchResults(toolInput, validCreatorIds);
  }

  const text = getTextContent(message);
  try {
    return validateMatchResults(JSON.parse(extractJsonArray(text)), validCreatorIds);
  } catch {
    throw new Error(MATCH_PARSE_ERROR);
  }
}

async function repairMatchResponse(rawResponse: string, validCreatorIds: Set<string>) {
  const repairPrompt = `Repair this creator matching response into valid JSON only.

Rules:
- Return ONLY a JSON object with this shape: {"matches":[{"creatorId":"...","fitScore":0,"reason":"..."}]}
- Preserve only entries with creatorId, fitScore, and reason.
- creatorId must be one of these exact IDs: ${Array.from(validCreatorIds).join(", ")}
- fitScore must be a number from 0 to 100.
- Do not add markdown, prose, comments, or trailing text.

Response to repair:
${rawResponse}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: repairPrompt }],
    tools: [matchResultsTool],
    tool_choice: { type: "tool", name: MATCH_RESULTS_TOOL_NAME },
  });

  return parseMatchResponse(message, validCreatorIds);
}

export async function matchCreators(
  brandAnalysis: BrandAnalysis,
  creators: CreatorForMatching[]
): Promise<CreatorMatchResult[]> {
  if (creators.length === 0) return [];

  const validCreatorIds = new Set(creators.map((creator) => creator.id));
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

Return creator scores using the ${MATCH_RESULTS_TOOL_NAME} tool. Include ALL creators even if score is low. Order by fitScore descending.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
    tools: [matchResultsTool],
    tool_choice: { type: "tool", name: MATCH_RESULTS_TOOL_NAME },
  });

  try {
    return parseMatchResponse(message, validCreatorIds);
  } catch {
    const rawResponse = getTextContent(message) || JSON.stringify(getToolInput(message) ?? "");
    try {
      return await repairMatchResponse(rawResponse, validCreatorIds);
    } catch {
      throw new Error(MATCH_PARSE_ERROR);
    }
  }
}
