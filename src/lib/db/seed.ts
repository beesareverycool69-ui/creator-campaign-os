/**
 * Database Seed Script
 * 
 * Creates test data for the Creator Campaign OS:
 * - 1 brand
 * - 3 creators with platforms
 * - 1 campaign
 * - 3 campaign creators at different pipeline stages
 * 
 * Run with: npm run db:seed
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL is not set");
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false, max: 1 });
const db = drizzle(client, { schema });
const seedUserId = process.env.SEED_USER_ID || "9d3e413d-3aef-4ea8-9019-6c94ec66e523";

async function seed() {
  console.log("🌱 Starting seed...\n");

  try {
    // ==========================================================================
    // 1. Create platforms (reference data)
    // ==========================================================================
    console.log("📱 Creating platforms...");
    
    const platformsData = [
      { id: "instagram", name: "Instagram", baseUrl: "https://instagram.com" },
      { id: "tiktok", name: "TikTok", baseUrl: "https://tiktok.com" },
      { id: "youtube", name: "YouTube", baseUrl: "https://youtube.com" },
      { id: "twitter", name: "Twitter/X", baseUrl: "https://x.com" },
    ];

    for (const platform of platformsData) {
      await db
        .insert(schema.platforms)
        .values(platform)
        .onConflictDoNothing();
    }

    // ==========================================================================
    // 2. Create brand
    // ==========================================================================
    console.log("🏢 Creating brand...");
    
    const [brand] = await db
      .insert(schema.brands)
      .values({
        userId: seedUserId,
        name: "Acme Fitness Co",
        website: "https://acmefitness.example.com",
        industry: "Fitness & Wellness",
        billingEmail: "billing@acmefitness.example.com",
      })
      .returning();

    console.log(`   Created brand: ${brand.name} (${brand.id})`);

    // ==========================================================================
    // 3. Create creators with platforms
    // ==========================================================================
    console.log("👥 Creating creators...");

    const creatorsData = [
      {
        name: "Alex Johnson",
        email: "alex@example.com",
        bio: "Fitness enthusiast and personal trainer. Helping people achieve their health goals!",
        country: "US",
        city: "Los Angeles",
        primaryPlatform: "instagram",
        tier: "micro" as const,
      },
      {
        name: "Jordan Lee",
        email: "jordan@example.com",
        bio: "Yoga instructor and wellness advocate. Mind, body, and soul.",
        country: "US",
        city: "San Francisco",
        primaryPlatform: "tiktok",
        tier: "mid" as const,
      },
      {
        name: "Sam Rivera",
        email: "sam@example.com",
        bio: "CrossFit athlete and nutrition coach. Let's get strong together!",
        country: "US",
        city: "Miami",
        primaryPlatform: "youtube",
        tier: "macro" as const,
      },
    ];

    const creators = await db
      .insert(schema.creators)
      .values(creatorsData)
      .returning();

    for (const creator of creators) {
      console.log(`   Created creator: ${creator.name} (${creator.id})`);
    }

    // Create platforms for each creator
    console.log("🔗 Adding platform accounts...");

    const creatorPlatformsData = [
      // Alex - Instagram & TikTok
      {
        creatorId: creators[0].id,
        platformId: "instagram",
        handle: "@alexjohnson_fit",
        followerCount: 45000,
        engagementRate: "4.2",
        verified: false,
      },
      {
        creatorId: creators[0].id,
        platformId: "tiktok",
        handle: "@alexjfitness",
        followerCount: 28000,
        engagementRate: "6.8",
        verified: false,
      },
      // Jordan - TikTok & Instagram
      {
        creatorId: creators[1].id,
        platformId: "tiktok",
        handle: "@jordanyoga",
        followerCount: 180000,
        engagementRate: "5.5",
        verified: true,
      },
      {
        creatorId: creators[1].id,
        platformId: "instagram",
        handle: "@jordanlee_wellness",
        followerCount: 95000,
        engagementRate: "3.8",
        verified: false,
      },
      // Sam - YouTube & Instagram
      {
        creatorId: creators[2].id,
        platformId: "youtube",
        handle: "SamRiveraFitness",
        followerCount: 520000,
        avgViews: 85000,
        engagementRate: "8.2",
        verified: true,
      },
      {
        creatorId: creators[2].id,
        platformId: "instagram",
        handle: "@samrivera_crossfit",
        followerCount: 310000,
        engagementRate: "4.5",
        verified: true,
      },
    ];

    await db.insert(schema.creatorPlatforms).values(creatorPlatformsData);

    // ==========================================================================
    // 4. Create brand-creator relationships
    // ==========================================================================
    console.log("🤝 Creating brand-creator relationships...");

    const brandCreatorsData = creators.map((creator, index) => ({
      brandId: brand.id,
      creatorId: creator.id,
      status: "active" as const,
      source: "manual",
      fitScore: 75 + index * 5,
      notes: `Great fit for fitness campaigns. ${["Strong on Instagram", "TikTok native", "YouTube long-form specialist"][index]}`,
    }));

    const brandCreators = await db
      .insert(schema.brandCreators)
      .values(brandCreatorsData)
      .returning();

    for (const bc of brandCreators) {
      console.log(`   Linked brand-creator: ${bc.id}`);
    }

    // ==========================================================================
    // 5. Create campaign
    // ==========================================================================
    console.log("📢 Creating campaign...");

    const [campaign] = await db
      .insert(schema.campaigns)
      .values({
        brandId: brand.id,
        name: "Summer Fitness Challenge 2024",
        description: "Promote our new summer fitness line with authentic creator content showing real workouts and lifestyle integration.",
        objective: "awareness",
        budget: "15000.00",
        currency: "USD",
        startDate: "2024-06-01",
        endDate: "2024-08-31",
        status: "active",
        targetPlatforms: ["instagram", "tiktok", "youtube"],
        targetCreatorCount: 5,
      })
      .returning();

    console.log(`   Created campaign: ${campaign.name} (${campaign.id})`);

    // ==========================================================================
    // 6. Create campaign creators at different pipeline stages
    // ==========================================================================
    console.log("🎯 Adding creators to campaign at different stages...");

    const campaignCreatorsData = [
      // Alex - In recruitment phase (invited)
      {
        campaignId: campaign.id,
        brandCreatorId: brandCreators[0].id,
        status: "invited" as const,
        rate: "500.00",
        rateType: "flat" as const,
        platformId: "instagram",
        deliverableCount: 2,
        notes: "Sent initial outreach email. Waiting for response.",
        invitedAt: new Date(),
      },
      // Jordan - In onboarding (ready to ship product)
      {
        campaignId: campaign.id,
        brandCreatorId: brandCreators[1].id,
        status: "ready" as const,
        rate: "1500.00",
        rateType: "flat" as const,
        platformId: "tiktok",
        deliverableCount: 3,
        notes: "Contract signed. Ready to ship products.",
        invitedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        acceptedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        readyAt: new Date(),
      },
      // Sam - In execution (creating content)
      {
        campaignId: campaign.id,
        brandCreatorId: brandCreators[2].id,
        status: "creating" as const,
        rate: "3500.00",
        rateType: "flat" as const,
        affiliateCode: "SAM20",
        affiliateRate: "10.00",
        platformId: "youtube",
        deliverableCount: 1,
        notes: "Product shipped and received. Working on YouTube video.",
        invitedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        acceptedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        readyAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    ];

    const campaignCreators = await db
      .insert(schema.campaignCreators)
      .values(campaignCreatorsData)
      .returning();

    for (const cc of campaignCreators) {
      const creator = creators.find((c) => 
        brandCreators.find((bc) => bc.id === cc.brandCreatorId)?.creatorId === c.id
      );
      console.log(`   Added ${creator?.name} to campaign (status: ${cc.status})`);
    }

    // ==========================================================================
    // Done!
    // ==========================================================================
    console.log("\n✅ Seed completed successfully!");
    console.log("\nSummary:");
    console.log(`   - 1 brand: ${brand.name}`);
    console.log(`   - 3 creators with platforms`);
    console.log(`   - 1 campaign: ${campaign.name}`);
    console.log(`   - 3 campaign creators:`);
    console.log(`     • Alex Johnson - invited (recruitment)`);
    console.log(`     • Jordan Lee - ready (onboarding)`);
    console.log(`     • Sam Rivera - creating (execution)`);

  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
