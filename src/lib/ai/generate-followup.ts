import Anthropic from "@anthropic-ai/sdk";
import type { BrandAnalysis } from "@/lib/db/schema";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type FollowUpContext = {
  brand: {
    name: string;
    analysis: BrandAnalysis | null | undefined;
  };
  creator: {
    name: string;
    platforms: { platformId: string; handle: string }[];
  };
  daysSinceContact: number;
  originalMessage: string | null;
};

export async function generateFollowUpMessage(ctx: FollowUpContext): Promise<string> {
  const { brand, creator, daysSinceContact, originalMessage } = ctx;

  const prompt = `You are writing a follow-up DM from a brand to a creator who hasn't responded to an initial outreach.

BRAND: ${brand.name}
${brand.analysis ? `Tone: ${brand.analysis.toneOfVoice}` : ""}

CREATOR: ${creator.name}
${creator.platforms.map((p) => `${p.platformId} @${p.handle}`).join(", ")}

DAYS SINCE FIRST MESSAGE: ${daysSinceContact}

${originalMessage ? `ORIGINAL MESSAGE SENT:\n"${originalMessage}"\n` : ""}

Write a short follow-up DM (2–3 sentences). Rules:
- Address them by first name
- Don't be passive-aggressive or guilt-trip them
- Acknowledge you're following up, not that they ignored you
- Add one small new angle — a specific reason why the timing is good now, or a softer ask (e.g. even just a "yes/no works!")
- Keep the brand tone: ${brand.analysis?.toneOfVoice ?? "friendly and professional"}
- Plain text only, no sign-off, no subject line, no placeholders

Return ONLY the message. Nothing else.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return text.trim();
}
