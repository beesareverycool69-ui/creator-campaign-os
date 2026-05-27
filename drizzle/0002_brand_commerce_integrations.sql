CREATE TABLE IF NOT EXISTS "brand_commerce_integrations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "brand_id" uuid NOT NULL,
  "provider" varchar(50) DEFAULT 'shopify' NOT NULL,
  "shop_domain" varchar(255),
  "access_token_encrypted" text,
  "webhook_secret_encrypted" text,
  "status" varchar(50) DEFAULT 'not_connected' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "brand_commerce_integrations" ADD CONSTRAINT "brand_commerce_integrations_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_brand_commerce_provider" ON "brand_commerce_integrations" ("brand_id","provider");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brand_commerce_integrations_brand_id_idx" ON "brand_commerce_integrations" ("brand_id");
