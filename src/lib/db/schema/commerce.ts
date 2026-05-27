import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { brands } from "./brands";

// =============================================================================
// BRAND COMMERCE INTEGRATION
// =============================================================================
export const brandCommerceIntegrations = pgTable("brand_commerce_integrations", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Owned by Brand
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),

  // Provider connection
  provider: varchar("provider", { length: 50 }).notNull().default("shopify"),
  shopDomain: varchar("shop_domain", { length: 255 }),

  // Credentials are encrypted at rest with COMMERCE_CREDENTIAL_ENCRYPTION_KEY.
  accessTokenEncrypted: text("access_token_encrypted"),
  webhookSecretEncrypted: text("webhook_secret_encrypted"),

  // Connection lifecycle
  status: varchar("status", { length: 50 }).notNull().default("not_connected"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueBrandProvider: uniqueIndex("unique_brand_commerce_provider")
    .on(table.brandId, table.provider),
  brandIdIdx: index("brand_commerce_integrations_brand_id_idx").on(table.brandId),
}));

// =============================================================================
// RELATIONS
// =============================================================================
export const brandCommerceIntegrationsRelations = relations(
  brandCommerceIntegrations,
  ({ one }) => ({
    brand: one(brands, {
      fields: [brandCommerceIntegrations.brandId],
      references: [brands.id],
    }),
  })
);
