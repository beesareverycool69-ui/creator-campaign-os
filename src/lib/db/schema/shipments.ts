import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { shipmentStatusEnum } from "./enums";
import { campaignCreators } from "./campaign-creators";
import { addresses } from "./creators";
import { products } from "./campaigns";

// =============================================================================
// SHIPMENT (Product shipment to a creator)
// =============================================================================
export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Owned by CampaignCreator
  campaignCreatorId: uuid("campaign_creator_id").notNull().references(() => campaignCreators.id, { onDelete: "cascade" }),
  
  // Shipping address (from creator's addresses)
  addressId: uuid("address_id").notNull().references(() => addresses.id),
  
  // Carrier info
  carrier: varchar("carrier", { length: 50 }),
  trackingNumber: varchar("tracking_number", { length: 100 }),
  trackingUrl: varchar("tracking_url", { length: 500 }),
  
  // Status (shipment lifecycle)
  status: shipmentStatusEnum("status").notNull().default("pending"),
  
  // Notes
  notes: text("notes"),
  
  // Timeline
  shippedAt: timestamp("shipped_at"),
  estimatedDelivery: date("estimated_delivery"),
  deliveredAt: timestamp("delivered_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// =============================================================================
// SHIPMENT ITEM (Line items in a shipment)
// =============================================================================
export const shipmentItems = pgTable("shipment_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  shipmentId: uuid("shipment_id").notNull().references(() => shipments.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
});

// =============================================================================
// RELATIONS
// =============================================================================
export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  campaignCreator: one(campaignCreators, {
    fields: [shipments.campaignCreatorId],
    references: [campaignCreators.id],
  }),
  address: one(addresses, {
    fields: [shipments.addressId],
    references: [addresses.id],
  }),
  items: many(shipmentItems),
}));

export const shipmentItemsRelations = relations(shipmentItems, ({ one }) => ({
  shipment: one(shipments, {
    fields: [shipmentItems.shipmentId],
    references: [shipments.id],
  }),
  product: one(products, {
    fields: [shipmentItems.productId],
    references: [products.id],
  }),
}));
