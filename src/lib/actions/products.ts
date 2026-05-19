"use server";

import { db } from "@/lib/db";
import { requireOwnedBrand } from "@/lib/auth/access";
import { products } from "@/lib/db/schema";
import { revalidatePath } from "next/cache";

export type CreateProductInput = {
  brandId: string;
  name: string;
  sku?: string;
  description?: string;
  value?: string;
  currency?: string;
  weightGrams?: number;
};

export async function createProduct(input: CreateProductInput) {
  await requireOwnedBrand(input.brandId);

  if (!input.name.trim()) {
    throw new Error("Product name is required");
  }

  const [product] = await db
    .insert(products)
    .values({
      brandId: input.brandId,
      name: input.name.trim(),
      sku: input.sku?.trim() || null,
      description: input.description?.trim() || null,
      value: input.value || null,
      currency: input.currency || "USD",
      weightGrams: input.weightGrams || null,
      isActive: true,
    })
    .returning();

  revalidatePath(`/brands/${input.brandId}`);
  revalidatePath("/dashboard");

  return product;
}
