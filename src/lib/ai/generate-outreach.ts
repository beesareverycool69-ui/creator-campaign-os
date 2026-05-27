import Anthropic from "@anthropic-ai/sdk";
import type { BrandAnalysis } from "@/lib/db/schema";
import { NO_DASH_COPY_RULE, sanitizeGeneratedText } from "@/lib/utils/generated-copy";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MAX_DM_CHARACTERS = 650;
const BANNED_DM_PHRASES = [
  "next-level",
  "proprietary",
  "science-first",
  "convenience-driven",
  "natural match",
  "natural fit",
  "community you've built",
  "community you’ve built",
  "would love to share more details",
];

function sanitizeOutreachDm(text: string) {
  let cleaned = sanitizeGeneratedText(text);

  for (const phrase of BANNED_DM_PHRASES) {
    cleaned = cleaned.replace(new RegExp(phrase, "gi"), "").replace(/\s{2,}/g, " ").trim();
  }

  if (cleaned.length <= MAX_DM_CHARACTERS) return cleaned;

  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) ?? [cleaned];
  let shortened = "";

  for (const sentence of sentences) {
    const next = `${shortened}${shortened ? " " : ""}${sentence.trim()}`;
    if (next.length > MAX_DM_CHARACTERS) break;
    shortened = next;
  }

  return shortened || `${cleaned.slice(0, MAX_DM_CHARACTERS - 1).trimEnd()}.`;
}

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
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    throw new Error("AI personalization is not configured yet.");
  }

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
        `Niche/category: ${brand.analysis.niche}`,
        `Summary: ${brand.analysis.summary}`,
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

Write a short, personalized outreach DM. Make it feel like a real Instagram DM, not a pitch email.

Rules:
- 3 to 5 sentences max
- Keep it under ${MAX_DM_CHARACTERS} characters if possible
- Plainspoken, casual, and human
- Address the creator by first name
- Include one specific reason we like their content or platform presence
- Include one simple sentence connecting ${brand.name} to what they already talk about
- Describe ${brand.name} only using the supplied brand niche/category or summary above. Do not invent a product category, positioning, or claim. If the supplied brand context is thin, just say "we're ${brand.name}" without adding a category.
- End with a soft CTA, like "Open to taking a look?" or "Would you be open to chatting?"
- Do not over-explain the product
- Do not sound like a press release
- Write in plain text, no subject line, no sign-off, no placeholders in brackets
- Do NOT use generic phrases like "I came across your profile" or "I love your content"
- Do NOT use these phrases: ${BANNED_DM_PHRASES.join(", ")}
- ${NO_DASH_COPY_RULE}

Return ONLY the message text. Nothing else.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 220,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return sanitizeOutreachDm(text);
}
