import Anthropic from "@anthropic-ai/sdk";
import type { BrandAnalysis } from "@/lib/db/schema";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Fetch the brand website and extract readable text
async function fetchBrandContent(url: string): Promise<string> {
  const normalized = url.startsWith("http") ? url : `https://${url}`;

  const response = await fetch(normalized, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; BrandAnalyzer/1.0)" },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${normalized}: ${response.status}`);
  }

  const html = await response.text();

  // Extract meaningful text — title, meta, headings, paragraphs
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "";
  const metaDesc =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)?.[1] ??
    "";

  // Strip scripts, styles, and tags — keep text
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Cap at 6000 chars to stay well within token budget
  const body = stripped.slice(0, 6000);

  return `TITLE: ${title}\nDESCRIPTION: ${metaDesc}\n\nPAGE TEXT:\n${body}`;
}

export async function analyzeBrand(website: string): Promise<BrandAnalysis> {
  const content = await fetchBrandContent(website);

  const prompt = `You are analyzing a brand's website to build a creator marketing profile.

Here is the website content:
<website>
${content}
</website>

Return ONLY a valid JSON object with this exact shape — no markdown, no explanation:
{
  "niche": "one concise phrase describing the brand's category/niche",
  "toneOfVoice": "2-4 adjectives or short phrases describing their tone",
  "targetAudience": "1-2 sentences describing their target customer (age, interests, values)",
  "idealCreatorProfile": {
    "followerRange": { "min": 10000, "max": 500000 },
    "contentStyle": "description of the content style that would resonate with this brand",
    "platforms": ["instagram", "tiktok"],
    "niche": "creator niche that aligns with this brand"
  },
  "summary": "2-3 sentences summarizing the brand and why a specific type of creator would be a good fit"
}

Base follower ranges on the brand's apparent scale: micro (5k-50k), mid-tier (50k-500k), macro (500k+). Include multiple platforms if appropriate.`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Strip any accidental markdown fences
  const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

  let parsed: BrandAnalysis;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }

  return parsed;
}
