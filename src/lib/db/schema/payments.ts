import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { paymentTypeEnum, paymentStatusEnum, conversionStatusEnum } from "./enums";
import { campaignCreators } from "./campaign-creators";
import { contents } from "./content";

// =============================================================================
// PAYMENT (Payments to creators)
// =============================================================================
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Owned by CampaignCreator
  campaignCreatorId: uuid("campaign_creator_id").notNull().references(() => campaignCreators.id, { onDelete: "cascade" }),
  
  // Amount
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  
  // Type and description
  type: paymentTypeEnum("type").notNull(),
  description: varchar("description", { length: 255 }),
  
  // Status (payment lifecycle)
  status: paymentStatusEnum("status").notNull().default("pending"),
  
  // Payment details
  paymentMethod: varchar("payment_method", { length: 50 }), // paypal, bank, etc.
  externalReference: varchar("external_reference", { length: 255 }), // transaction ID
  
  // Timeline
  dueDate: date("due_date"),
  paidAt: timestamp("paid_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// AFFILIATE CLICK (Tracks clicks on affiliate/tracking links)
// =============================================================================
export const affiliateClicks = pgTable("affiliate_clicks", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Attribution
  campaignCreatorId: uuid("campaign_creator_id").notNull().references(() => campaignCreators.id, { onDelete: "cascade" }),
  contentId: uuid("content_id").references(() => contents.id),
  
  // Click data
  url: varchar("url", { length: 500 }).notNull(),
  ipHash: varchar("ip_hash", { length: 64 }), // hashed for privacy
  userAgent: text("user_agent"),
  referrer: varchar("referrer", { length: 500 }),
  country: varchar("country", { length: 2 }),
  
  // Timestamp
  clickedAt: timestamp("clicked_at").notNull().defaultNow(),
});

// =============================================================================
// AFFILIATE CONVERSION (Tracks conversions from affiliate links)
// =============================================================================
export const affiliateConversions = pgTable("affiliate_conversions", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Attribution
  campaignCreatorId: uuid("campaign_creator_id").notNull().references(() => campaignCreators.id, { onDelete: "cascade" }),
  contentId: uuid("content_id").references(() => contents.id),
  clickId: uuid("click_id").references(() => affiliateClicks.id),
  
  // Order data
  orderId: varchar("order_id", { length: 100 }).notNull(),
  orderValue: decimal("order_value", { precision: 10, scale: 2 }).notNull(),
  
  // Commission
  commission: decimal("commission", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  
  // Status
  status: conversionStatusEnum("status").notNull().default("pending"),
  
  // Timestamps
  convertedAt: timestamp("converted_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =============================================================================
// RELATIONS
// =============================================================================
export const paymentsRelations = relations(payments, ({ one }) => ({
  campaignCreator: one(campaignCreators, {
    fields: [payments.campaignCreatorId],
    references: [campaignCreators.id],
  }),
}));

export const affiliateClicksRelations = relations(affiliateClicks, ({ one }) => ({
  campaignCreator: one(campaignCreators, {
    fields: [affiliateClicks.campaignCreatorId],
    references: [campaignCreators.id],
  }),
  content: one(contents, {
    fields: [affiliateClicks.contentId],
    references: [contents.id],
  }),
}));

export const affiliateConversionsRelations = relations(affiliateConversions, ({ one }) => ({
  campaignCreator: one(campaignCreators, {
    fields: [affiliateConversions.campaignCreatorId],
    references: [campaignCreators.id],
  }),
  content: one(contents, {
    fields: [affiliateConversions.contentId],
    references: [contents.id],
  }),
  click: one(affiliateClicks, {
    fields: [affiliateConversions.clickId],
    references: [affiliateClicks.id],
  }),
}));
