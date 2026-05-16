import Link from "next/link";
import { CampaignForm } from "@/components/features/campaigns";
import { getBrands } from "@/lib/actions/brands";

type Props = {
  searchParams: Promise<{ brandId?: string; brandCreatorId?: string }>;
};

export default async function NewCampaignPage({ searchParams }: Props) {
  const { brandId, brandCreatorId } = await searchParams;
  const brands = await getBrands();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/campaigns" className="hover:text-foreground">
          Campaigns
        </Link>
        <span>/</span>
        <span>New</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">New Campaign</h1>
        <p className="text-muted-foreground mt-1">
          Create a new creator campaign
        </p>
      </div>

      {/* Form */}
      {brands.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <h3 className="text-lg font-medium mb-2">No brands yet</h3>
          <p className="text-muted-foreground mb-4">
            You need to create a brand before creating a campaign.
          </p>
          <Link
            href="/brands/new"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            + Create Brand
          </Link>
        </div>
      ) : (
        <CampaignForm
          brands={brands.map((b) => ({ id: b.id, name: b.name }))}
          defaultBrandId={brandId}
          pendingBrandCreatorId={brandCreatorId}
        />
      )}
    </div>
  );
}
