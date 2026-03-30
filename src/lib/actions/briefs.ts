"use server";

import Anthropic from "@anthropic-ai/sdk";
import type { BrandAnalysis } from "@/lib/db/schema";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// =============================================================================
// TYPES
// =============================================================================
export type GenerateBriefInput = {
  brandId: string;
  brandCreatorId: string;
  brandName: string;
  brandAnalysis: BrandAnalysis | null;
  creatorName: string;
  creatorBio: string | null;
  creatorPlatform: string;
  creatorHandle: string;
  campaignName: string;
  cta: string;
  contentTypes: string[];
  notes: string;
  talkingPoints: string;
};

export type GenerateBriefResult =
  | { success: true; brief: string }
  | { success: false; error: string };

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Generate a creator brief using AI
 */
export async function generateBriefAction(
  input: GenerateBriefInput
): Promise<GenerateBriefResult> {
  const {
    brandName,
    brandAnalysis,
    creatorName,
    creatorBio,
    creatorPlatform,
    creatorHandle,
    campaignName,
    cta,
    contentTypes,
    notes,
    talkingPoints,
  } = input;

  const brandContext = brandAnalysis
    ? `
Niche: ${brandAnalysis.niche}
Tone: ${brandAnalysis.toneOfVoice}
Target audience: ${brandAnalysis.targetAudience}
Ideal creator profile: ${JSON.stringify(brandAnalysis.idealCreatorProfile)}
`
    : `Brand: ${brandName}`;

  const prompt = `You are creating a professional creator brief for an influencer marketing campaign.

BRAND:
Name: ${brandName}
${brandContext}

CREATOR:
Name: ${creatorName}
Handle: @${creatorHandle}
Platform: ${creatorPlatform}
${creatorBio ? `Bio: ${creatorBio}` : ""}

CAMPAIGN DETAILS:
Campaign Name: ${campaignName}
Content Types: ${contentTypes.join(", ")}
Call-to-Action: ${cta}
${notes ? `Additional Notes: ${notes}` : ""}
${talkingPoints ? `Talking Points:\n${talkingPoints}` : ""}

Generate a comprehensive creator brief that includes:

1. **Campaign Overview** (2-3 sentences about the campaign goals and why this creator is a great fit)

2. **Content Requirements**
   - Content format(s): ${contentTypes.join(", ")}
   - Suggested video length or format specs
   - Key messages to convey

3. **Script Ideas** (2-3 creative concepts the creator could use)

4. **B-Roll Suggestions** (specific shots that would enhance the content)

5. **Call-to-Action** 
   - What viewers should do: ${cta}
   - How to present it naturally

6. **Brand Guidelines**
   - Tone and style guidance
   - Things to emphasize
   - Things to avoid

7. **Deliverables & Timeline**
   - What to submit
   - Review process

8. **Contact & Questions**
   - How to reach out with questions

Format the brief in a clean, professional way with clear sections. Use markdown formatting.
Make it feel personal and collaborative, not corporate.
Keep the total length reasonable (about 500-700 words).`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    return { success: true, brief: text.trim() };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error };
  }
}

/**
 * Save a brief to the database (placeholder for now)
 */
export async function saveBriefAction(
  brandCreatorId: string,
  brief: string
): Promise<{ success: boolean }> {
  // TODO: Save to database
  return { success: true };
}
