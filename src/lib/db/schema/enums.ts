import { pgEnum } from "drizzle-orm/pg-core";

// Creator tiers (global)
export const creatorTierEnum = pgEnum("creator_tier", [
  "nano",
  "micro",
  "mid",
  "macro",
  "mega",
]);

// BrandCreator status (lead lifecycle)
export const brandCreatorStatusEnum = pgEnum("brand_creator_status", [
  "discovered",
  "researching",
  "qualified",
  "unqualified",
  "contacted",
  "engaged",
  "active",
  "paused",
  "churned",
  "blacklisted",
]);

// Campaign status
export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "review",
  "approved",
  "recruiting",
  "active",
  "paused",
  "wrapping",
  "completed",
  "cancelled",
  "archived",
]);

// Campaign objective
export const campaignObjectiveEnum = pgEnum("campaign_objective", [
  "awareness",
  "engagement",
  "conversions",
  "content",
  "other",
]);

// CampaignCreator status (participation + execution lifecycle)
export const campaignCreatorStatusEnum = pgEnum("campaign_creator_status", [
  // Recruitment
  "shortlisted",
  "invited",
  "reminded",
  "negotiating",
  "accepted",
  "declined",
  "ghosted",
  // Onboarding
  "onboarding",
  "ready",
  // Execution
  "shipped",
  "creating",
  "in_review",
  "revision",
  "approved",
  "posting",
  "posted",
  "completed",
  // Terminal
  "dropped",
  "withdrawn",
]);

// Rate type for creator compensation
export const rateTypeEnum = pgEnum("rate_type", [
  "flat",
  "per_post",
  "per_view",
  "affiliate",
]);

// Outreach channel
export const outreachChannelEnum = pgEnum("outreach_channel", [
  "email",
  "instagram_dm",
  "tiktok_dm",
  "twitter_dm",
  "other",
]);

// Outreach status
export const outreachStatusEnum = pgEnum("outreach_status", [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "delivered",
  "opened",
  "clicked",
  "replied",
  "bounced",
  "failed",
  "expired",
  "no_response",
]);

// Agreement status
export const agreementStatusEnum = pgEnum("agreement_status", [
  "draft",
  "pending_review",
  "ready",
  "sent",
  "viewed",
  "signed",
  "countersigned",
  "active",
  "expired",
  "terminated",
  "superseded",
]);

// Shipment status
export const shipmentStatusEnum = pgEnum("shipment_status", [
  "pending",
  "preparing",
  "on_hold",
  "label_created",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed_attempt",
  "exception",
  "returned",
  "lost",
  "cancelled",
]);

// Content type
export const contentTypeEnum = pgEnum("content_type", [
  "post",
  "story",
  "reel",
  "video",
  "short",
  "tweet",
  "other",
]);

// Content status
export const contentStatusEnum = pgEnum("content_status", [
  // Creation
  "pending",
  "in_progress",
  "submitted",
  "in_review",
  "revision_requested",
  "approved",
  "rejected",
  "cancelled",
  // Posting
  "scheduled",
  "posting",
  "posted",
  "live",
  "underperforming",
  "completed",
  "removed",
  "failed",
]);

// Payment type
export const paymentTypeEnum = pgEnum("payment_type", [
  "flat_fee",
  "milestone",
  "bonus",
  "affiliate",
]);

// Payment status
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "due",
  "processing",
  "paid",
  "failed",
  "cancelled",
]);

// Affiliate conversion status
export const conversionStatusEnum = pgEnum("conversion_status", [
  "pending",
  "confirmed",
  "rejected",
  "paid",
]);

// Brief status
export const briefStatusEnum = pgEnum("brief_status", [
  "draft",
  "active",
  "archived",
]);
