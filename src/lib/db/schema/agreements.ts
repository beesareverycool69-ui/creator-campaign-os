import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { agreementStatusEnum } from "./enums";
import { campaignCreators } from "./campaign-creators";
import { briefs } from "./campaigns";

// =============================================================================
// AGREEMENT (Contract between brand and creator for a campaign)
// =============================================================================
export const agreements = pgTable("agreements", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Owned by CampaignCreator
  campaignCreatorId: uuid("campaign_creator_id").notNull().references(() => campaignCreators.id, { onDelete: "cascade" }),
  
  // Optional link to brief
  briefId: uuid("brief_id").references(() => briefs.id),
  
  // Agreement content
  title: varchar("title", { length: 255 }).notNull(),
  terms: text("terms"),
  
  // Compensation (JSON structure for flexibility)
  compensation: text("compensation"), // JSON string
  
  // Rights and exclusivity
  usageRights: text("usage_rights"),
  exclusivity: text("exclusivity"),
  
  // Timeline
  startDate: date("start_date"),
  endDate: date("end_date"),
  
  // Document
  documentUrl: varchar("document_url", { length: 500 }),
  
  // Status (agreement lifecycle)
  status: agreementStatusEnum("status").notNull().default("draft"),
  
  // Signature tracking
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  signedAt: timestamp("signed_at"),
  countersignedAt: timestamp("countersigned_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// RELATIONS
// =============================================================================
export const agreementsRelations = relations(agreements, ({ one }) => ({
  campaignCreator: one(campaignCreators, {
    fields: [agreements.campaignCreatorId],
    references: [campaignCreators.id],
  }),
  brief: one(briefs, {
    fields: [agreements.briefId],
    references: [briefs.id],
  }),
}));
