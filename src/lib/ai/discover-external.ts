import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;

export interface DiscoveredCreator {
  handle: string;
  name: string;
  platform: "instagram" | "tiktok" | "youtube" | "twitter";
  profileUrl: string;
  bio?: string;
  followers?: string;
  location?: string;
  niche?: string;
  confidence: number; // 0-100 how confident we are this is a real creator
}

export interface DiscoveryParams {
  keywords: string;
  platform: "instagram" | "tiktok" | "youtube" | "all";
  location?: string;
  minFollowers?: number;
  maxFollowers?: number;
  limit?: number;
}

async function searchBrave(query: string, count = 10): Promise<string[]> {
  if (!BRAVE_API_KEY) {
    throw new Error("BRAVE_API_KEY not configured");
  }

  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(count));

  const response = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json",
      "X-Subscription-Token": BRAVE_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave search failed: ${response.status}`);
  }

  const data = await response.json();
  
  // Extract URLs and snippets from results
  const results: string[] = [];
  for (const result of data.web?.results || []) {
    results.push(`URL: ${result.url}\nTitle: ${result.title}\nSnippet: ${result.description || ""}`);
  }

  return results;
}

export async function discoverCreators(params: DiscoveryParams): Promise<DiscoveredCreator[]> {
  const { keywords, platform, location, limit = 10 } = params;

  // Build search queries based on platform
  const queries: string[] = [];
  
  const locationStr = location ? ` ${location}` : "";
  const baseQuery = `${keywords} influencer${locationStr}`;

  if (platform === "all" || platform === "instagram") {
    queries.push(`${baseQuery} instagram site:instagram.com`);
  }
  if (platform === "all" || platform === "tiktok") {
    queries.push(`${baseQuery} tiktok site:tiktok.com`);
  }
  if (platform === "all" || platform === "youtube") {
    queries.push(`${baseQuery} youtuber youtube channel site:youtube.com`);
  }

  // Run searches
  const allResults: string[] = [];
  for (const query of queries) {
    try {
      const results = await searchBrave(query, Math.ceil(limit / queries.length) + 5);
      allResults.push(...results);
    } catch (error) {
      console.error(`Search failed for "${query}":`, error);
    }
  }

  if (allResults.length === 0) {
    return [];
  }

  // Use Claude to parse and extract creator info from search results
  const prompt = `You are extracting influencer/creator profiles from search results.

SEARCH CONTEXT:
Keywords: ${keywords}
${location ? `Location: ${location}` : ""}
Platform filter: ${platform}

SEARCH RESULTS:
${allResults.join("\n\n---\n\n")}

Extract creator profiles from these results. For each creator found, determine:
- handle (username without @)
- name (display name if visible)
- platform (instagram, tiktok, or youtube)
- profileUrl (full URL to their profile)
- bio (if visible in snippet)
- followers (if mentioned, format as "10K", "1.2M", etc.)
- location (city/country if mentioned or inferable)
- niche (their content category based on context)
- confidence (0-100 how confident this is a real active creator profile, not a news article or random mention)

Return ONLY a valid JSON array. Skip results that aren't actual creator profiles.
Only include results with confidence >= 50.
Limit to ${limit} results, prioritize higher confidence scores.

[
  {
    "handle": "username",
    "name": "Display Name",
    "platform": "instagram",
    "profileUrl": "https://instagram.com/username",
    "bio": "optional bio",
    "followers": "50K",
    "location": "Austin, TX",
    "niche": "fitness",
    "confidence": 85
  }
]`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as DiscoveredCreator[];
    
    // Filter by follower range if specified
    return parsed.filter(creator => {
      if (!creator.followers) return true;
      
      const followerNum = parseFollowerCount(creator.followers);
      if (params.minFollowers && followerNum < params.minFollowers) return false;
      if (params.maxFollowers && followerNum > params.maxFollowers) return false;
      
      return true;
    }).slice(0, limit);
  } catch {
    console.error("Failed to parse Claude response:", cleaned.slice(0, 200));
    return [];
  }
}

function parseFollowerCount(str: string): number {
  const match = str.match(/(\d+\.?\d*)([KMB])?/i);
  if (!match) return 0;
  
  let num = parseFloat(match[1]);
  const suffix = match[2]?.toUpperCase();
  
  if (suffix === "K") num *= 1000;
  else if (suffix === "M") num *= 1000000;
  else if (suffix === "B") num *= 1000000000;
  
  return Math.round(num);
}

/**
 * Enrich a single creator handle with more details
 * Tries to find more info about a known handle
 */
export async function enrichCreatorProfile(
  handle: string,
  platform: "instagram" | "tiktok" | "youtube"
): Promise<DiscoveredCreator | null> {
  const query = `"${handle}" ${platform} influencer creator`;
  
  try {
    const results = await searchBrave(query, 5);
    
    if (results.length === 0) return null;

    const prompt = `Extract profile information for the creator @${handle} on ${platform} from these search results:

${results.join("\n\n---\n\n")}

Return ONLY a JSON object with available info:
{
  "handle": "${handle}",
  "name": "Display Name if found",
  "platform": "${platform}",
  "profileUrl": "profile URL",
  "bio": "bio if found",
  "followers": "follower count if found",
  "location": "location if found",
  "niche": "content niche",
  "confidence": 80
}

If you can't find reliable info, return: {"confidence": 0}`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
    
    const parsed = JSON.parse(cleaned) as DiscoveredCreator;
    return parsed.confidence >= 50 ? parsed : null;
  } catch (error) {
    console.error(`Failed to enrich @${handle}:`, error);
    return null;
  }
}
