import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { contentTypeEnum, contentStatusEnum } from "./enums";
import { campaignCreators } from "./campaign-creators";
import { platforms } from "./creators";

// =============================================================================
// CONTENT (Content pieces created by creators)
// =============================================================================
export const contents = pgTable("contents", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Owned by CampaignCreator
  campaignCreatorId: uuid("campaign_creator_id").notNull().references(() => campaignCreators.id, { onDelete: "cascade" }),
  
  // Platform for this content
  platformId: varchar("platform_id", { length: 50 }).references(() => platforms.id),
  
  // Content details
  type: contentTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }),
  caption: text("caption"),
  
  // Files (stored in Supabase Storage)
  fileUrls: text("file_urls").array(), // uploaded content files
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  
  // Posted content
  postUrl: varchar("post_url", { length: 500 }),
  postId: varchar("post_id", { length: 100 }), // platform's post ID
  
  // Scheduling
  scheduledFor: timestamp("scheduled_for"),
  postedAt: timestamp("posted_at"),
  
  // Status (content lifecycle)
  status: contentStatusEnum("status").notNull().default("pending"),
  
  // Revisions
  revisionCount: integer("revision_count").default(0),
  
  // Approval
  approvedBy: uuid("approved_by"), // user ID (add FK later when users table exists)
  approvedAt: timestamp("approved_at"),
  
  // Notes
  notes: text("notes"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// CONTENT REVISION (Feedback and revision requests)
// =============================================================================
export const contentRevisions = pgTable("content_revisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentId: uuid("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  
  // Feedback
  feedback: text("feedback").notNull(),
  fileUrls: text("file_urls").array(), // annotated screenshots, etc.
  
  // Who requested (add FK later when users table exists)
  requestedBy: uuid("requested_by"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =============================================================================
// CONTENT METRICS (Performance data - time series)
// =============================================================================
export const contentMetrics = pgTable("content_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentId: uuid("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  
  // When metrics were captured
  recordedAt: timestamp("recorded_at").notNull(),
  
  // Engagement metrics
  views: integer("views"),
  impressions: integer("impressions"),
  reach: integer("reach"),
  likes: integer("likes"),
  comments: integer("comments"),
  shares: integer("shares"),
  saves: integer("saves"),
  clicks: integer("clicks"),
  
  // Calculated
  engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }),
  
  // Video-specific
  watchTimeSeconds: integer("watch_time_seconds"),
  avgWatchPercentage: decimal("avg_watch_percentage", { precision: 5, scale: 2 }),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =============================================================================
// RELATIONS
// =============================================================================
export const contentsRelations = relations(contents, ({ one, many }) => ({
  campaignCreator: one(campaignCreators, {
    fields: [contents.campaignCreatorId],
    references: [campaignCreators.id],
  }),
  platform: one(platforms, {
    fields: [contents.platformId],
    references: [platforms.id],
  }),
  revisions: many(contentRevisions),
  metrics: many(contentMetrics),
}));

export const contentRevisionsRelations = relations(contentRevisions, ({ one }) => ({
  content: one(contents, {
    fields: [contentRevisions.contentId],
    references: [contents.id],
  }),
}));

export const contentMetricsRelations = relations(contentMetrics, ({ one }) => ({
  content: one(contents, {
    fields: [contentMetrics.contentId],
    references: [contents.id],
  }),
}));
