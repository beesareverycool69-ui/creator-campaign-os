import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { brandCreatorStatusEnum } from "./enums";
import { creators } from "./creators";

// =============================================================================
// TYPES
// =============================================================================
export type BrandAnalysis = {
  niche: string;
  toneOfVoice: string;
  targetAudience: string;
  idealCreatorProfile: {
    followerRange: { min: number; max: number };
    contentStyle: string;
    platforms: string[];
    niche: string;
  };
  summary: string;
};

// =============================================================================
// BRAND
// =============================================================================
export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  
  // Identity
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: varchar("logo_url", { length: 500 }),
  website: varchar("website", { length: 255 }),
  industry: varchar("industry", { length: 100 }),
  
  // Billing (basic, expand later)
  billingEmail: varchar("billing_email", { length: 255 }),

  // AI Analysis
  brandAnalysis: jsonb("brand_analysis").$type<BrandAnalysis>(),
  analyzedAt: timestamp("analyzed_at"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("brands_user_id_idx").on(table.userId),
}));

// =============================================================================
// BRAND CREATOR (Brand-level relationship with a creator)
// This is where lead lifecycle status lives — NOT on global Creator
// =============================================================================
export const brandCreators = pgTable("brand_creators", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  creatorId: uuid("creator_id").notNull().references(() => creators.id, { onDelete: "cascade" }),
  
  // Lead lifecycle status (brand-specific!)
  status: brandCreatorStatusEnum("status").notNull().default("discovered"),
  
  // Discovery
  source: varchar("source", { length: 100 }), // how this brand found them
  sourceDetail: varchar("source_detail", { length: 255 }),
  
  // Qualification
  fitScore: integer("fit_score"), // 1-100
  
  // Notes (brand-specific)
  notes: text("notes"),
  
  // Tags (denormalized for speed, can normalize later if needed)
  tags: text("tags").array(),
  
  // Contact tracking
  firstContactedAt: timestamp("first_contacted_at"),
  lastContactedAt: timestamp("last_contacted_at"),
  lastActiveAt: timestamp("last_active_at"),
  
  // Do not contact
  doNotContact: boolean("do_not_contact").default(false),
  doNotContactReason: varchar("do_not_contact_reason", { length: 255 }),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// RELATIONS
// =============================================================================
export const brandsRelations = relations(brands, ({ many }) => ({
  brandCreators: many(brandCreators),
}));

export const brandCreatorsRelations = relations(brandCreators, ({ one }) => ({
  brand: one(brands, {
    fields: [brandCreators.brandId],
    references: [brands.id],
  }),
  creator: one(creators, {
    fields: [brandCreators.creatorId],
    references: [creators.id],
  }),
}));
