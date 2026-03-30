import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { creators, creatorPlatforms, brandCreators } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

interface ImportedCreator {
  handle: string;
  platform: "instagram" | "tiktok" | "youtube" | "twitter";
  name?: string;
  followers?: string;
  niche?: string;
  location?: string;
  profileUrl?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const { creators: importedCreators } = (await request.json()) as {
      creators: ImportedCreator[];
    };

    if (!importedCreators || !Array.isArray(importedCreators)) {
      return NextResponse.json(
        { error: "Creators array is required" },
        { status: 400 }
      );
    }

    const results = {
      created: 0,
      linked: 0,
      skipped: 0,
    };

    for (const imported of importedCreators) {
      if (!imported.handle) continue;

      const handle = imported.handle.replace("@", "").toLowerCase();
      const platformId = imported.platform;

      // Check if creator platform already exists
      const [existingPlatform] = await db
        .select()
        .from(creatorPlatforms)
        .where(
          and(
            eq(creatorPlatforms.handle, handle),
            eq(creatorPlatforms.platformId, platformId)
          )
        )
        .limit(1);

      let creatorId: string;

      if (existingPlatform) {
        creatorId = existingPlatform.creatorId;
      } else {
        // Parse location into city/country if possible
        let city: string | undefined;
        let country: string | undefined;
        if (imported.location) {
          const parts = imported.location.split(",").map(p => p.trim());
          city = parts[0];
          // Try to detect country code from common patterns
          const lastPart = parts[parts.length - 1]?.toUpperCase();
          if (lastPart?.length === 2) {
            country = lastPart;
          } else if (lastPart?.includes("US") || lastPart?.includes("USA")) {
            country = "US";
          }
        }

        // Create new creator
        const [newCreator] = await db
          .insert(creators)
          .values({
            name: imported.name || handle,
            primaryPlatform: platformId,
            city,
            country,
          })
          .returning();

        creatorId = newCreator.id;

        // Parse follower count
        let followerCount: number | undefined;
        if (imported.followers) {
          const match = imported.followers.match(/(\d+\.?\d*)([KMB])?/i);
          if (match) {
            let num = parseFloat(match[1]);
            const suffix = match[2]?.toUpperCase();
            if (suffix === "K") num *= 1000;
            else if (suffix === "M") num *= 1000000;
            else if (suffix === "B") num *= 1000000000;
            followerCount = Math.round(num);
          }
        }

        // Create creator platform
        await db.insert(creatorPlatforms).values({
          creatorId,
          platformId,
          handle,
          followerCount,
          profileUrl: imported.profileUrl,
        });

        results.created++;
      }

      // Check if already linked to brand
      const [existingLink] = await db
        .select()
        .from(brandCreators)
        .where(
          and(
            eq(brandCreators.brandId, brandId),
            eq(brandCreators.creatorId, creatorId)
          )
        )
        .limit(1);

      if (existingLink) {
        results.skipped++;
      } else {
        // Link creator to brand
        await db.insert(brandCreators).values({
          brandId,
          creatorId,
          status: "discovered",
          source: "import",
          sourceDetail: `Discovered via ${platformId}`,
        });
        results.linked++;
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Created ${results.created} new creators, linked ${results.linked} to brand, skipped ${results.skipped} duplicates`,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Failed to import creators" },
      { status: 500 }
    );
  }
}
