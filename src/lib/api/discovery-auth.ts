import { NextResponse } from "next/server";
import { requireOwnedBrand, requireUser } from "@/lib/auth/access";

export async function requireDiscoveryApiAccess(brandId?: string | null) {
  try {
    if (brandId) {
      await requireOwnedBrand(brandId);
    } else {
      await requireUser();
    }
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication required";
    return NextResponse.json(
      { error: message === "Authentication required" ? message : "Brand not found" },
      { status: message === "Authentication required" ? 401 : 404 }
    );
  }
}
