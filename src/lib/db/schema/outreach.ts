import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { outreachChannelEnum, outreachStatusEnum } from "./enums";
import { brandCreators, brands } from "./brands";
import { campaignCreators } from "./campaign-creators";

// =============================================================================
// OUTREACH TEMPLATE (Reusable message templates)
// =============================================================================
export const outreachTemplates = pgTable("outreach_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  
  // Template info
  name: varchar("name", { length: 255 }).notNull(),
  channel: outreachChannelEnum("channel").notNull(),
  subject: varchar("subject", { length: 255 }), // for email
  body: text("body").notNull(), // template with placeholders
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// OUTREACH (Individual outreach messages)
// =============================================================================
// Owned by EITHER:
// - BrandCreator (prospecting/general outreach)
// - CampaignCreator (campaign-specific outreach)
// Exactly one must be set.
// =============================================================================
export const outreaches = pgTable("outreaches", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Owner (exactly one must be set)
  brandCreatorId: uuid("brand_creator_id").references(() => brandCreators.id, { onDelete: "cascade" }),
  campaignCreatorId: uuid("campaign_creator_id").references(() => campaignCreators.id, { onDelete: "cascade" }),
  
  // Message details
  channel: outreachChannelEnum("channel").notNull(),
  subject: varchar("subject", { length: 255 }), // for email
  message: text("message").notNull(),
  
  // Template reference
  templateId: uuid("template_id").references(() => outreachTemplates.id),
  
  // Status (outreach lifecycle)
  status: outreachStatusEnum("status").notNull().default("draft"),
  
  // Tracking timestamps
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  repliedAt: timestamp("replied_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Ensure exactly one owner is set
  ownerCheck: check(
    "outreach_owner_check",
    sql`(brand_creator_id IS NOT NULL AND campaign_creator_id IS NULL) OR 
        (brand_creator_id IS NULL AND campaign_creator_id IS NOT NULL)`
  ),
}));

// =============================================================================
// RELATIONS
// =============================================================================
export const outreachTemplatesRelations = relations(outreachTemplates, ({ one }) => ({
  brand: one(brands, {
    fields: [outreachTemplates.brandId],
    references: [brands.id],
  }),
}));

export const outreachesRelations = relations(outreaches, ({ one }) => ({
  brandCreator: one(brandCreators, {
    fields: [outreaches.brandCreatorId],
    references: [brandCreators.id],
  }),
  campaignCreator: one(campaignCreators, {
    fields: [outreaches.campaignCreatorId],
    references: [campaignCreators.id],
  }),
  template: one(outreachTemplates, {
    fields: [outreaches.templateId],
    references: [outreachTemplates.id],
  }),
}));
