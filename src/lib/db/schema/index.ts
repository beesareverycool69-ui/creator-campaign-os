// =============================================================================
// CREATOR CAMPAIGN OS - DATABASE SCHEMA
// =============================================================================
// 
// Entity hierarchy:
// 
// GLOBAL LAYER (shared across all brands)
// - Creator (identity only)
// - CreatorPlatform (social presence)
// - Address (shipping)
// - Platform (reference table)
// 
// BRAND LAYER (brand-creator relationship)
// - Brand
// - BrandCreator (lead lifecycle lives here)
// - OutreachTemplate
// 
// CAMPAIGN LAYER (execution)
// - Campaign
// - Brief
// - Product
// - CampaignCreator (THE HUB - everything attaches here)
// - Outreach
// - Agreement
// - Shipment / ShipmentItem
// - Content / ContentRevision / ContentMetrics
// - Payment
// - AffiliateClick / AffiliateConversion
// 
// =============================================================================

// Enums
export * from "./enums";

// Global layer
export * from "./creators";

// Brand layer
export * from "./brands";

// Campaign layer
export * from "./campaigns";
export * from "./campaign-creators";
export * from "./outreach";
export * from "./agreements";
export * from "./shipments";
export * from "./content";
export * from "./payments";
