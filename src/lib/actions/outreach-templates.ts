"use server";

import { db } from "@/lib/db";
import { requireOwnedBrand, requireUser } from "@/lib/auth/access";
import { brands, outreachTemplates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type OutreachTemplate = typeof outreachTemplates.$inferSelect;
export type NewOutreachTemplate = typeof outreachTemplates.$inferInsert;

export async function getTemplatesByBrand(brandId: string) {
  await requireOwnedBrand(brandId);

  return db
    .select()
    .from(outreachTemplates)
    .where(eq(outreachTemplates.brandId, brandId))
    .orderBy(outreachTemplates.createdAt);
}

export async function getTemplateById(id: string) {
  const user = await requireUser();

  const [template] = await db
    .select({ template: outreachTemplates })
    .from(outreachTemplates)
    .innerJoin(brands, eq(outreachTemplates.brandId, brands.id))
    .where(and(eq(outreachTemplates.id, id), eq(brands.userId, user.id)))
    .limit(1);
  return template?.template;
}

export async function createTemplate(
  brandId: string,
  data: {
    name: string;
    channel: "email" | "instagram_dm" | "tiktok_dm" | "twitter_dm" | "other";
    subject?: string;
    body: string;
  }
) {
  await requireOwnedBrand(brandId);

  const [template] = await db
    .insert(outreachTemplates)
    .values({
      brandId,
      name: data.name,
      channel: data.channel,
      subject: data.subject,
      body: data.body,
    })
    .returning();

  revalidatePath(`/brands/${brandId}/settings`);
  return template;
}

export async function updateTemplate(
  id: string,
  data: {
    name?: string;
    channel?: "email" | "instagram_dm" | "tiktok_dm" | "twitter_dm" | "other";
    subject?: string;
    body?: string;
  }
) {
  const existing = await getTemplateById(id);

  if (!existing) {
    throw new Error("Template not found");
  }

  const [template] = await db
    .update(outreachTemplates)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(outreachTemplates.id, id))
    .returning();

  if (template) {
    revalidatePath(`/brands/${template.brandId}/settings`);
  }
  return template;
}

export async function deleteTemplate(id: string) {
  const existing = await getTemplateById(id);

  if (!existing) {
    throw new Error("Template not found");
  }

  const [template] = await db
    .delete(outreachTemplates)
    .where(eq(outreachTemplates.id, id))
    .returning();

  if (template) {
    revalidatePath(`/brands/${template.brandId}/settings`);
  }
  return template;
}
