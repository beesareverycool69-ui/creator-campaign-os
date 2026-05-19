import { db } from "@/lib/db";
import { brandCreators, brands } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { and, eq } from "drizzle-orm";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Authentication required");
  }

  return user;
}

export async function requireOwnedBrand(brandId: string) {
  const user = await requireUser();

  const [brand] = await db
    .select()
    .from(brands)
    .where(and(eq(brands.id, brandId), eq(brands.userId, user.id)))
    .limit(1);

  if (!brand) {
    throw new Error("Brand not found");
  }

  return brand;
}

export async function requireOwnedBrandCreator(brandCreatorId: string) {
  const user = await requireUser();

  const [brandCreator] = await db
    .select({
      id: brandCreators.id,
      brandId: brandCreators.brandId,
      creatorId: brandCreators.creatorId,
      status: brandCreators.status,
      notes: brandCreators.notes,
      firstContactedAt: brandCreators.firstContactedAt,
    })
    .from(brandCreators)
    .innerJoin(brands, eq(brandCreators.brandId, brands.id))
    .where(and(eq(brandCreators.id, brandCreatorId), eq(brands.userId, user.id)))
    .limit(1);

  if (!brandCreator) {
    throw new Error("Record not found");
  }

  return brandCreator;
}
