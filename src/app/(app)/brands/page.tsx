import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
        <EmptyState
          title="No brands yet"
          description="Add your first brand to start building creator outreach lists."
          actionHref="/brands/new"
          actionLabel="+ Add Brand"
        />
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
