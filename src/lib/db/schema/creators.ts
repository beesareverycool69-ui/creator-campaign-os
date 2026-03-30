import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { creatorTierEnum } from "./enums";

// =============================================================================
// CREATOR (Global identity - no brand relationship here)
// =============================================================================
export const creators = pgTable("creators", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Identity
  email: varchar("email", { length: 255 }).unique(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  bio: text("bio"),
  avatarUrl: varchar("avatar_url", { length: 500 }),
  
  // Location
  country: varchar("country", { length: 2 }), // ISO 3166-1 alpha-2
  city: varchar("city", { length: 100 }),
  
  // Profile
  primaryPlatform: varchar("primary_platform", { length: 50 }),
  tier: creatorTierEnum("tier"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// PLATFORM (Reference table for social platforms)
// =============================================================================
export const platforms = pgTable("platforms", {
  id: varchar("id", { length: 50 }).primaryKey(), // e.g., 'instagram', 'tiktok'
  name: varchar("name", { length: 100 }).notNull(),
  iconUrl: varchar("icon_url", { length: 500 }),
  baseUrl: varchar("base_url", { length: 255 }),
});

// =============================================================================
// CREATOR PLATFORM (Creator's presence on each platform)
// =============================================================================
export const creatorPlatforms = pgTable("creator_platforms", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id").notNull().references(() => creators.id, { onDelete: "cascade" }),
  platformId: varchar("platform_id", { length: 50 }).notNull().references(() => platforms.id),
  
  // Platform-specific data
  handle: varchar("handle", { length: 100 }).notNull(),
  profileUrl: varchar("profile_url", { length: 500 }),
  
  // Metrics
  followerCount: integer("follower_count"),
  followingCount: integer("following_count"),
  engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }),
  avgViews: integer("avg_views"),
  verified: boolean("verified").default(false),
  
  // Sync
  lastSyncedAt: timestamp("last_synced_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// ADDRESS (Shipping addresses - owned by creator, reusable across brands)
// =============================================================================
export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id").notNull().references(() => creators.id, { onDelete: "cascade" }),
  
  // Address details
  label: varchar("label", { length: 50 }), // e.g., "Home", "Office"
  recipientName: varchar("recipient_name", { length: 255 }).notNull(),
  street1: varchar("street_1", { length: 255 }).notNull(),
  street2: varchar("street_2", { length: 255 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }).notNull(),
  country: varchar("country", { length: 2 }).notNull(), // ISO 3166-1 alpha-2
  phone: varchar("phone", { length: 50 }),
  
  isDefault: boolean("is_default").default(false),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// RELATIONS
// =============================================================================
export const creatorsRelations = relations(creators, ({ many }) => ({
  platforms: many(creatorPlatforms),
  addresses: many(addresses),
}));

export const creatorPlatformsRelations = relations(creatorPlatforms, ({ one }) => ({
  creator: one(creators, {
    fields: [creatorPlatforms.creatorId],
    references: [creators.id],
  }),
  platform: one(platforms, {
    fields: [creatorPlatforms.platformId],
    references: [platforms.id],
  }),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  creator: one(creators, {
    fields: [addresses.creatorId],
    references: [creators.id],
  }),
}));
