import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LeadRow,
  LeadStatusBadge,
  AddCreatorToBrandForm,
  BrandAnalysisCard,
  CreatorMatchResults,
} from "@/components/features/brands";
import { getBrandById } from "@/lib/actions/brands";
import {
  getBrandCreators,
  getLeadStatusCounts,
} from "@/lib/actions/brand-creators";
import { getCreators } from "@/lib/actions/creators";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function BrandPage({ params }: Props) {
  const { id } = await params;

  const [brand, brandCreators, statusCounts, allCreators] = await Promise.all([
    getBrandById(id),
    getBrandCreators(id),
    getLeadStatusCounts(id),
    getCreators(),
  ]);

  if (!brand) {
    notFound();
  }

  // Get creators not yet linked to this brand
  const linkedCreatorIds = new Set(brandCreators.map((bc) => bc.creator.id));
  const availableCreators = allCreators
    .filter((c) => !linkedCreatorIds.has(c.id))
    .map((c) => ({ id: c.id, name: c.name, email: c.email }));

  // Status funnel order
  const funnelStatuses = [
    "discovered",
    "researching",
    "qualified",
    "contacted",
    "engaged",
    "active",
  ] as const;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/brands" className="hover:text-foreground">
          Brands
        </Link>
        <span>/</span>
        <span>{brand.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-6">
        {/* Logo */}
        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-2xl font-semibold shrink-0">
          {brand.logoUrl ? (
            <img
              src={brand.logoUrl}
              alt={brand.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
          ) : (
            brand.name.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{brand.name}</h1>
            {brand.industry && (
              <Badge variant="secondary" className="capitalize">
                {brand.industry}
              </Badge>
            )}
          </div>
          {brand.website && (
            <a
              href={brand.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              {brand.website.replace(/^https?:\/\//, "")} →
            </a>
          )}
        </div>

        <Link href={`/brands/${id}/leads`}>
          <Button variant="outline">View All Leads</Button>
        </Link>
      </div>

      {/* Outreach Navigation */}
      <div className="grid grid-cols-5 gap-4">
        <Link href={`/brands/${id}/send-dms`} className="block">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <span className="text-blue-500 text-lg">✉️</span>
                </div>
                <div>
                  <p className="font-medium">Send DMs</p>
                  <p className="text-xs text-muted-foreground">
                    {statusCounts["discovered"] || 0} ready
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/brands/${id}/follow-ups`} className="block">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <span className="text-orange-500 text-lg">🔄</span>
                </div>
                <div>
                  <p className="font-medium">Follow-ups</p>
                  <p className="text-xs text-muted-foreground">Auto-scheduled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/brands/${id}/track`} className="block">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <span className="text-green-500 text-lg">📊</span>
                </div>
                <div>
                  <p className="font-medium">Track</p>
                  <p className="text-xs text-muted-foreground">
                    {statusCounts["contacted"] || 0} pending
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/brands/${id}/printing-press`} className="block">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <span className="text-purple-500 text-lg">🖨️</span>
                </div>
                <div>
                  <p className="font-medium">Printing Press</p>
                  <p className="text-xs text-muted-foreground">Briefs & Agreements</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/brands/${id}/settings`} className="block">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
                  <span className="text-gray-500 text-lg">⚙️</span>
                </div>
                <div>
                  <p className="font-medium">Settings</p>
                  <p className="text-xs text-muted-foreground">Templates & Config</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Lead Funnel Stats */}
      <div className="grid grid-cols-6 gap-4">
        {funnelStatuses.map((status) => (
          <Card key={status}>
            <CardContent className="pt-4 pb-4 text-center">
              <div className="text-2xl font-bold">
                {statusCounts[status] || 0}
              </div>
              <LeadStatusBadge status={status} className="mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Other status counts */}
      {(statusCounts["paused"] ||
        statusCounts["churned"] ||
        statusCounts["blacklisted"]) && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          {statusCounts["paused"] && (
            <span>Paused: {statusCounts["paused"]}</span>
          )}
          {statusCounts["churned"] && (
            <span>Churned: {statusCounts["churned"]}</span>
          )}
          {statusCounts["blacklisted"] && (
            <span>Blacklisted: {statusCounts["blacklisted"]}</span>
          )}
        </div>
      )}

      {/* Brand Analysis */}
      <BrandAnalysisCard
        brandId={id}
        hasWebsite={!!brand.website}
        analysis={brand.brandAnalysis}
        analyzedAt={brand.analyzedAt}
      />

      {/* Creator Matching */}
      <CreatorMatchResults
        brandId={id}
        hasAnalysis={!!brand.brandAnalysis}
      />

      {/* Recent Leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Creators ({brand.creatorCount})</CardTitle>
          <AddCreatorToBrandForm
            brandId={id}
            availableCreators={availableCreators}
          />
        </CardHeader>
        <CardContent>
          {brandCreators.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No creators linked to this brand yet. Add your first creator to
              start tracking leads.
            </p>
          ) : (
            <div className="space-y-2">
              {/* Header row */}
              <div className="hidden md:flex items-center gap-4 px-4 py-2 text-sm font-medium text-muted-foreground">
                <div className="flex-1">Creator</div>
                <div className="w-32">Source</div>
                <div className="hidden lg:block w-32">Last Contact</div>
                <div className="w-36">Status</div>
              </div>

              {/* Lead rows */}
              {brandCreators.slice(0, 10).map((bc) => (
                <LeadRow key={bc.id} brandCreator={bc} />
              ))}

              {brandCreators.length > 10 && (
                <div className="text-center pt-4">
                  <Link href={`/brands/${id}/leads`}>
                    <Button variant="outline">
                      View all {brandCreators.length} creators
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
