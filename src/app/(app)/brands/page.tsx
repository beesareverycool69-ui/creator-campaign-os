import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandCard } from "@/components/features/brands";
import { getBrands } from "@/lib/actions/brands";

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Brands</h1>
          <p className="text-muted-foreground mt-1">
            Manage your brand accounts
          </p>
        </div>
        <Link href="/brands/new">
          <Button>+ Add Brand</Button>
        </Link>
      </div>

      {/* Brand list */}
      {brands.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <h3 className="text-lg font-medium mb-2">No brands yet</h3>
          <p className="text-muted-foreground mb-4">
            Add your first brand to start managing creator relationships.
          </p>
          <Link href="/brands/new">
            <Button>+ Add Brand</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {brands.map((brand) => (
            <BrandCard key={brand.id} brand={brand} />
          ))}
        </div>
      )}
    </div>
  );
}
