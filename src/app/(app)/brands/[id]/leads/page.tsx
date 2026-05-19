import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LeadList,
  LeadStatusBadge,
  AddCreatorToBrandForm,
  LeadDiscovery,
  LeadStatus,
} from "@/components/features/brands";
import { getBrandById } from "@/lib/actions/brands";
import {
  getBrandCreators,
  getLeadStatusCounts,
} from "@/lib/actions/brand-creators";
import { getCreators } from "@/lib/actions/creators";
import { isConfiguredEnv } from "@/lib/env";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

const ALL_STATUSES: LeadStatus[] = [
  "discovered",
  "researching",
  "qualified",
  "contacted",
  "engaged",
  "active",
  "paused",
  "churned",
  "blacklisted",
];

export default async function BrandLeadsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { status: statusFilter } = await searchParams;

  const [brand, statusCounts, allCreators] = await Promise.all([
    getBrandById(id),
    getLeadStatusCounts(id),
    getCreators(),
  ]);

  if (!brand) {
    notFound();
  }

  // Fetch brand creators with optional filter
  const brandCreators = await getBrandCreators(
    id,
    statusFilter as LeadStatus | undefined
  );

  // Get creators not yet linked to this brand
  const linkedCreatorIds = new Set(brandCreators.map((bc) => bc.creator.id));
  const availableCreators = allCreators
    .filter((c) => !linkedCreatorIds.has(c.id))
    .map((c) => ({ id: c.id, name: c.name, email: c.email }));

  const totalCount = Object.values(statusCounts).reduce(
    (sum, count) => sum + count,
    0
  );

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
        <span>Leads</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground mt-1">
            {totalCount} creators linked to {brand.name}
          </p>
        </div>
        <AddCreatorToBrandForm
          brandId={id}
          availableCreators={availableCreators}
        />
      </div>

      {/* Discovery section */}
      <LeadDiscovery
        brandId={id}
        aiConfig={{
          anthropic: isConfiguredEnv("ANTHROPIC_API_KEY"),
          brave: isConfiguredEnv("BRAVE_API_KEY"),
        }}
      />

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        <Link href={`/brands/${id}/leads`}>
          <Button
            variant={!statusFilter ? "default" : "outline"}
            size="sm"
          >
            All ({totalCount})
          </Button>
        </Link>
        {ALL_STATUSES.map((status) => {
          const count = statusCounts[status] || 0;
          if (count === 0) return null;

          return (
            <Link key={status} href={`/brands/${id}/leads?status=${status}`}>
              <Button
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                className="gap-2"
              >
                <LeadStatusBadge status={status} />
                <span>({count})</span>
              </Button>
            </Link>
          );
        })}
      </div>

      {/* Lead list */}
      <Card>
        <CardHeader>
          <CardTitle>
            {statusFilter ? (
              <>
                <span className="capitalize">{statusFilter}</span> Leads (
                {brandCreators.length})
              </>
            ) : (
              <>All Leads ({brandCreators.length})</>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {brandCreators.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              {statusFilter
                ? `No creators with status "${statusFilter}".`
                : "No creators linked to this brand yet."}
            </p>
          ) : (
            <LeadList brandCreators={brandCreators} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
