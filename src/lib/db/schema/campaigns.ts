import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  decimal,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  campaignStatusEnum,
  campaignObjectiveEnum,
  briefStatusEnum,
} from "./enums";
import { brands } from "./brands";

// =============================================================================
// CAMPAIGN
// =============================================================================
export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  
  // Basic info
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  objective: campaignObjectiveEnum("objective"),
  
  // Budget
  budget: decimal("budget", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("USD"),
  
  // Timeline
  startDate: date("start_date"),
  endDate: date("end_date"),
  
  // Status (campaign lifecycle)
  status: campaignStatusEnum("status").notNull().default("draft"),
  
  // Targets
  targetPlatforms: text("target_platforms").array(), // platform IDs
  targetCreatorCount: integer("target_creator_count"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// BRIEF (Campaign brief document)
// =============================================================================
export const briefs = pgTable("briefs", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  
  // Content
  title: varchar("title", { length: 255 }).notNull(),
  overview: text("overview"),
  
  // Deliverables (JSON structure)
  deliverables: text("deliverables"), // JSON string
  
  // Guidelines
  guidelines: text("guidelines"),
  dos: text("dos").array(),
  donts: text("donts").array(),
  talkingPoints: text("talking_points").array(),
  
  // Required elements
  hashtags: text("hashtags").array(),
  mentions: text("mentions").array(),
  links: text("links"), // JSON string with UTM params
  
  // Reference content
  referenceContent: text("reference_content"), // JSON string with URLs
  
  // Deadline
  deadline: date("deadline"),
  
  // Version control
  version: integer("version").default(1),
  status: briefStatusEnum("status").notNull().default("draft"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// PRODUCT (Products that can be shipped to creators)
// =============================================================================
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  
  // Basic info
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }),
  description: text("description"),
  imageUrl: varchar("image_url", { length: 500 }),
  
  // Value
  value: decimal("value", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("USD"),
  
  // Shipping
  weightGrams: integer("weight_grams"),
  
  // Status
  isActive: boolean("is_active").default(true),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// RELATIONS
// =============================================================================
export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  brand: one(brands, {
    fields: [campaigns.brandId],
    references: [brands.id],
  }),
  briefs: many(briefs),
}));

export const briefsRelations = relations(briefs, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [briefs.campaignId],
    references: [campaigns.id],
  }),
}));

export const productsRelations = relations(products, ({ one }) => ({
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
}));
