import Link from "next/link";
import { notFound } from "next/navigation";
import { getBrandById } from "@/lib/actions/brands";
import { getBrandCreators } from "@/lib/actions/brand-creators";
import { AffiliatePipeline } from "@/components/features/affiliates/affiliate-pipeline";
import { getPortalUrlsForBrandCreators } from "@/lib/actions/creator-portal";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AffiliatesPage({ params }: Props) {
  const { id } = await params;
  
  const [brand, activeCreators] = await Promise.all([
    getBrandById(id),
    getBrandCreators(id, "active"),
  ]);

  const uploadUrlsByBrandCreatorId = await getPortalUrlsForBrandCreators(
    activeCreators.map((creator) => creator.id)
  );

  if (!brand) {
    notFound();
  }

  // Calculate stats from notes (simplified - would use proper status field in production)
  const shipped = activeCreators.filter(c => c.notes?.includes("[SHIPPED]") && !c.notes?.includes("[DELIVERED]"));
  const awaitingContent = activeCreators.filter(c => c.notes?.includes("[DELIVERED]") && !c.notes?.includes("[CONTENT_RECEIVED]"));
  const reviewContent = activeCreators.filter(c => c.notes?.includes("[CONTENT_RECEIVED]") && !c.notes?.includes("[APPROVED]"));
  const readyToPost = activeCreators.filter(c => c.notes?.includes("[APPROVED]") && !c.notes?.includes("[POSTED]"));
  const posted = activeCreators.filter(c => c.notes?.includes("[POSTED]"));

  // Stats
  const totalRevenue = posted.length * 85; // Placeholder calculation
  const overdue = awaitingContent.filter(c => {
    // Simple overdue check - would use actual dates in production
    return false;
  }).length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/brands" className="hover:text-foreground">
          Brands
        </Link>
        <span>/</span>
        <Link href={`/brands/${id}`} className="hover:text-foreground">
          {brand.name}
        </Link>
        <span>/</span>
        <span>Affiliates</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Affiliates</h1>
          <p className="text-muted-foreground mt-1">
            Manage creator partnerships, campaigns, and content pipeline.
          </p>
        </div>
        <button className="px-4 py-2 border rounded-md text-sm hover:bg-muted">
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-3xl font-bold text-blue-500">{activeCreators.length}</p>
          <p className="text-sm text-muted-foreground">ACTIVE CAMPAIGNS</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-3xl font-bold text-orange-500">{overdue}</p>
          <p className="text-sm text-muted-foreground">OVERDUE</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-3xl font-bold text-green-500">{posted.length}</p>
          <p className="text-sm text-muted-foreground">POSTED THIS WEEK</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-3xl font-bold text-primary">${totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">TOTAL REVENUE</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-2 border-b">
        <button className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
          Roster
        </button>
        <button className="px-4 py-2 text-sm font-medium border-b-2 border-primary text-foreground">
          Pipeline
        </button>
      </div>

      {/* Pipeline stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-500">{shipped.length + awaitingContent.length}</p>
          <p className="text-xs text-muted-foreground">SHIP PRODUCT</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-500">{awaitingContent.length}</p>
          <p className="text-xs text-muted-foreground">AWAITING CONTENT</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-500">{reviewContent.length}</p>
          <p className="text-xs text-muted-foreground">REVIEW CONTENT</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-500">{readyToPost.length}</p>
          <p className="text-xs text-muted-foreground">READY TO POST</p>
        </div>
      </div>

      {/* Pipeline Kanban */}
      <AffiliatePipeline 
        brandId={id}
        creators={activeCreators}
        uploadUrlsByBrandCreatorId={uploadUrlsByBrandCreatorId}
      />
    </div>
  );
}
