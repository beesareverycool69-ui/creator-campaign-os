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

type SearchResult = {
  query: string;
  url: string;
  title: string;
  snippet: string;
};

type Platform = DiscoveredCreator["platform"];

type CandidateSearchResult = SearchResult & {
  platform: Exclude<Platform, "twitter">;
  handle: string;
  profileUrl: string;
};

const BLOCKED_INSTAGRAM_PATHS = new Set([
  "p",
  "reel",
  "reels",
  "stories",
  "explore",
  "accounts",
  "about",
  "developer",
  "directory",
]);

const BLOCKED_TIKTOK_PATHS = new Set([
  "discover",
  "tag",
  "music",
  "video",
  "embed",
  "foryou",
  "live",
]);

const BLOCKED_YOUTUBE_PATHS = new Set([
  "watch",
  "shorts",
  "results",
  "playlist",
  "feed",
  "hashtag",
  "embed",
]);

async function searchBrave(query: string, count = 10): Promise<SearchResult[]> {
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
  return (data.web?.results || []).map((result: any) => ({
    query,
    url: result.url,
    title: result.title || "",
    snippet: result.description || "",
  }));
}

function normalizeSearchTerm(term: string) {
  return term
    .toLowerCase()
    .replace(/[#@]/g, "")
    .replace(/\b(creators?|influencers?|educators?|reviewers?)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchTerms(keywords: string, limit: number) {
  const rawTerms = keywords
    .split(/[,;|\n]+/)
    .map(normalizeSearchTerm)
    .filter((term) => term.length >= 3);

  const terms = new Set<string>();
  rawTerms.forEach((term) => terms.add(term));

  // The old caller often passed one long, over-constrained keyword blob. Preserve it,
  // but also search meaningful sub-phrases so common creator categories are not starved.
  for (const raw of rawTerms) {
    const parts = raw
      .split(/\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 4 && !["creator", "influencer", "content"].includes(part));

    for (const part of parts) terms.add(part);
    for (let i = 0; i < parts.length - 1; i += 1) {
      terms.add(`${parts[i]} ${parts[i + 1]}`);
    }
  }

  return Array.from(terms).slice(0, Math.min(8, Math.max(4, limit)));
}

function buildPlatformQueries(term: string, platform: DiscoveryParams["platform"], location?: string) {
  const locationStr = location ? ` ${location}` : "";
  const queryTerm = term;
  const queries: { platform: Exclude<Platform, "twitter">; query: string }[] = [];

  if (platform === "all" || platform === "instagram") {
    queries.push({ platform: "instagram", query: `site:instagram.com ${queryTerm} creator influencer${locationStr}` });
  }
  if (platform === "all" || platform === "tiktok") {
    queries.push({ platform: "tiktok", query: `site:tiktok.com/@ ${queryTerm} creator${locationStr}` });
  }
  if (platform === "all" || platform === "youtube") {
    queries.push({ platform: "youtube", query: `site:youtube.com ${queryTerm} creator channel${locationStr}` });
  }

  return queries;
}

function safeUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function cleanHandle(handle: string) {
  return decodeURIComponent(handle)
    .replace(/^@/, "")
    .replace(/\?.*$/, "")
    .replace(/\/$/, "")
    .trim();
}

function extractProfileCandidate(result: SearchResult): CandidateSearchResult | null {
  const parsed = safeUrl(result.url);
  if (!parsed) return null;

  const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  if (hostname === "instagram.com") {
    const first = cleanHandle(segments[0]);
    if (!first || BLOCKED_INSTAGRAM_PATHS.has(first.toLowerCase())) return null;
    return {
      ...result,
      platform: "instagram",
      handle: first,
      profileUrl: `https://www.instagram.com/${first}/`,
    };
  }

  if (hostname === "tiktok.com") {
    const first = segments[0];
    if (!first.startsWith("@")) return null;
    const handle = cleanHandle(first);
    if (!handle || BLOCKED_TIKTOK_PATHS.has(handle.toLowerCase())) return null;
    return {
      ...result,
      platform: "tiktok",
      handle,
      profileUrl: `https://www.tiktok.com/@${handle}`,
    };
  }

  if (hostname === "youtube.com" || hostname === "m.youtube.com") {
    const first = segments[0];
    if (BLOCKED_YOUTUBE_PATHS.has(first.toLowerCase())) return null;

    if (first.startsWith("@")) {
      const handle = cleanHandle(first);
      return {
        ...result,
        platform: "youtube",
        handle,
        profileUrl: `https://www.youtube.com/@${handle}`,
      };
    }

    if (["channel", "c", "user"].includes(first.toLowerCase()) && segments[1]) {
      const handle = cleanHandle(segments[1]);
      return {
        ...result,
        platform: "youtube",
        handle,
        profileUrl: `https://www.youtube.com/${first}/${handle}`,
      };
    }
  }

  return null;
}

function extractJsonArray(text: string) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    return cleaned.slice(start, end + 1);
  }

  return cleaned;
}

function dedupeCandidates(results: SearchResult[]) {
  const candidates = new Map<string, CandidateSearchResult>();

  for (const result of results) {
    const candidate = extractProfileCandidate(result);
    if (!candidate) continue;

    const key = `${candidate.platform}:${candidate.handle.toLowerCase()}`;
    const existing = candidates.get(key);
    if (!existing || candidate.snippet.length > existing.snippet.length) {
      candidates.set(key, candidate);
    }
  }

  return Array.from(candidates.values());
}

export async function discoverCreators(params: DiscoveryParams): Promise<DiscoveredCreator[]> {
  const { keywords, platform, location, limit = 10 } = params;
  const searchTerms = buildSearchTerms(keywords, limit * 2);
  const queries = searchTerms.flatMap((term) => buildPlatformQueries(term, platform, location));
  const resultsPerQuery = Math.min(20, Math.max(8, Math.ceil((limit * 5) / Math.max(queries.length, 1))));

  const allResults: SearchResult[] = [];
  for (const { query } of queries) {
    try {
      const results = await searchBrave(query, resultsPerQuery);
      console.log(`[creator-discovery] Brave results=${results.length} query="${query}"`);
      allResults.push(...results);
    } catch (error) {
      console.error(`Search failed for "${query}":`, error);
    }
  }

  const profileCandidates = dedupeCandidates(allResults);
  console.log(
    `[creator-discovery] raw_results=${allResults.length} profile_candidates=${profileCandidates.length} filtered_before_claude=${allResults.length - profileCandidates.length}`
  );

  if (profileCandidates.length === 0) {
    return [];
  }

  const candidatesForClaude = profileCandidates.slice(0, Math.max(limit * 4, 40));

  const prompt = `You are extracting influencer/creator profiles from platform profile search results.

SEARCH CONTEXT:
Keywords: ${keywords}
Expanded search terms: ${searchTerms.join(", ")}
${location ? `Location: ${location}` : ""}
Platform filter: ${platform}

PROFILE CANDIDATES:
${candidatesForClaude.map((candidate, index) => `${index + 1}. Platform: ${candidate.platform}\nHandle: ${candidate.handle}\nProfile URL: ${candidate.profileUrl}\nTitle: ${candidate.title}\nSnippet: ${candidate.snippet}\nMatched query: ${candidate.query}`).join("\n\n---\n\n")}

For each real creator profile, return:
- handle (username without @)
- name (display name if visible; otherwise use handle)
- platform (instagram, tiktok, or youtube)
- profileUrl (the profile URL above)
- bio (if visible in title/snippet)
- followers (if mentioned, format as "10K", "1.2M", etc.)
- location (city/country if mentioned or inferable)
- niche (their content category based on context)
- confidence (0-100 how confident this is a real active creator profile in or adjacent to the search niche)

Rules:
- Return ONLY a valid JSON array.
- Use the exact profileUrl values from candidates; do not invent URLs.
- Skip articles, videos, hashtag/discover pages, brands, publications, and marketplaces.
- It is OK to include candidates with sparse snippets if the URL is a direct creator profile and the niche is plausible.
- Only include results with confidence >= 40; final brand-fit scoring happens later and remains strict.
- Limit to ${limit} results, prioritize creator/profile confidence and niche relevance.

[
  {
    "handle": "username",
    "name": "Display Name",
    "platform": "instagram",
    "profileUrl": "https://instagram.com/username",
    "bio": "optional bio",
    "followers": "50K",
    "location": "Austin, TX",
    "niche": "functional wellness",
    "confidence": 85
  }
]`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const cleaned = extractJsonArray(text);

  try {
    const parsed = JSON.parse(cleaned) as DiscoveredCreator[];
    const byKey = new Map<string, DiscoveredCreator>();

    for (const creator of parsed) {
      if (!creator.handle || !creator.platform || !creator.profileUrl) continue;
      if (creator.confidence < 40) continue;

      const followerNum = parseFollowerCount(creator.followers);
      if (params.minFollowers && followerNum < params.minFollowers) continue;
      if (params.maxFollowers && followerNum > params.maxFollowers) continue;

      const key = `${creator.platform}:${creator.handle.toLowerCase()}`;
      const existing = byKey.get(key);
      if (!existing || creator.confidence > existing.confidence) {
        byKey.set(key, creator);
      }
    }

    return Array.from(byKey.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  } catch {
    console.error("Failed to parse Claude response:", cleaned.slice(0, 200));
    return [];
  }
}

function parseFollowerCount(str?: string): number {
  if (!str) return 0;
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

${results.map((result) => `URL: ${result.url}\nTitle: ${result.title}\nSnippet: ${result.snippet}`).join("\n\n---\n\n")}

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
