import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { campaignCreatorStatusEnum, rateTypeEnum } from "./enums";
import { brandCreators } from "./brands";
import { campaigns } from "./campaigns";
import { platforms } from "./creators";

// =============================================================================
// CAMPAIGN CREATOR (THE HUB - everything attaches here)
// =============================================================================
// This is the most important table. It links a BrandCreator to a Campaign
// and tracks the entire participation + execution lifecycle.
// 
// Key design decisions:
// - Links to BrandCreator (not Creator directly) - maintains brand relationship layer
// - Status field drives the state machine for recruitment → execution → completion
// - All campaign work (agreements, shipments, content, payments) hangs off this
// =============================================================================
export const campaignCreators = pgTable("campaign_creators", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Core relationships
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  brandCreatorId: uuid("brand_creator_id").notNull().references(() => brandCreators.id, { onDelete: "cascade" }),
  
  // Participation lifecycle status (THE STATE MACHINE)
  status: campaignCreatorStatusEnum("status").notNull().default("shortlisted"),
  
  // Compensation
  rate: decimal("rate", { precision: 10, scale: 2 }),
  rateType: rateTypeEnum("rate_type"),
  currency: varchar("currency", { length: 3 }).default("USD"),
  
  // Affiliate tracking
  affiliateCode: varchar("affiliate_code", { length: 50 }),
  affiliateRate: decimal("affiliate_rate", { precision: 5, scale: 2 }), // percentage
  
  // Platform for this campaign
  platformId: varchar("platform_id", { length: 50 }).references(() => platforms.id),
  
  // Deliverables
  deliverableCount: integer("deliverable_count"),
  
  // Notes (campaign-specific)
  notes: text("notes"),
  
  // Lifecycle timestamps
  shortlistedAt: timestamp("shortlisted_at"),
  invitedAt: timestamp("invited_at"),
  acceptedAt: timestamp("accepted_at"),
  readyAt: timestamp("ready_at"),
  completedAt: timestamp("completed_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // A brand-creator can only be in a campaign once
  uniqueCampaignBrandCreator: uniqueIndex("unique_campaign_brand_creator")
    .on(table.campaignId, table.brandCreatorId),
}));

// =============================================================================
// RELATIONS
// =============================================================================
export const campaignCreatorsRelations = relations(campaignCreators, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignCreators.campaignId],
    references: [campaigns.id],
  }),
  brandCreator: one(brandCreators, {
    fields: [campaignCreators.brandCreatorId],
    references: [brandCreators.id],
  }),
  platform: one(platforms, {
    fields: [campaignCreators.platformId],
    references: [platforms.id],
  }),
}));
