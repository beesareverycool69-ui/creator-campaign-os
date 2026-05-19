import { NextRequest, NextResponse } from "next/server";
import { requireDiscoveryApiAccess } from "@/lib/api/discovery-auth";
import { db } from "@/lib/db";
import { creators, creatorPlatforms } from "@/lib/db/schema";
import { sql, desc, or, ilike } from "drizzle-orm";
import type { SearchKeywords } from "@/lib/types/discovery";

/**
 * Step 3a: Database Search (Track A)
 * Query existing creator database using generated keywords
 */
export async function POST(request: NextRequest) {
  try {
    const { keywords, brandId } = await request.json() as { keywords: SearchKeywords; brandId?: string };

    const authError = await requireDiscoveryApiAccess(brandId);
    if (authError) return authError;

    if (!keywords || !keywords.niche_keywords) {
      return NextResponse.json(
        { error: "Keywords are required" },
        { status: 400 }
      );
    }

    // Combine all keywords for search
    const allKeywords = [
      ...keywords.niche_keywords,
      ...keywords.audience_keywords,
      ...keywords.content_style_keywords,
      ...keywords.hashtags,
    ];

    // Build ILIKE conditions for bio search
    const searchConditions = allKeywords.map(
      (kw) => ilike(creators.bio, `%${kw}%`)
    );

    // Query creators with matching bios
    let matchedCreators: any[] = [];
    
    try {
      // Try to query the database
      matchedCreators = await db
        .select({
          id: creators.id,
          name: creators.name,
          bio: creators.bio,
          primaryPlatform: creators.primaryPlatform,
          city: creators.city,
          country: creators.country,
        })
        .from(creators)
        .where(or(...searchConditions))
        .limit(50);
    } catch (dbError) {
      // If query fails (e.g., no creators table or empty), return empty gracefully
      console.log("Database search skipped:", dbError);
      matchedCreators = [];
    }

    // If we found creators, get their platform details
    if (matchedCreators.length > 0) {
      const creatorIds = matchedCreators.map((c) => c.id);
      
      const platforms = await db
        .select({
          creatorId: creatorPlatforms.creatorId,
          platformId: creatorPlatforms.platformId,
          handle: creatorPlatforms.handle,
          profileUrl: creatorPlatforms.profileUrl,
          followerCount: creatorPlatforms.followerCount,
          engagementRate: creatorPlatforms.engagementRate,
        })
        .from(creatorPlatforms)
        .where(sql`${creatorPlatforms.creatorId} IN ${creatorIds}`);

      // Merge platform data into creators
      const platformMap = new Map<string, typeof platforms>();
      for (const p of platforms) {
        if (!platformMap.has(p.creatorId)) {
          platformMap.set(p.creatorId, []);
        }
        platformMap.get(p.creatorId)!.push(p);
      }

      matchedCreators = matchedCreators.map((c) => ({
        ...c,
        platforms: platformMap.get(c.id) || [],
        source: "database",
      }));
    }

    return NextResponse.json({
      success: true,
      count: matchedCreators.length,
      creators: matchedCreators,
      keywords_used: allKeywords.length,
    });
  } catch (error) {
    console.error("Database match error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Database search failed" },
      { status: 500 }
    );
  }
}
