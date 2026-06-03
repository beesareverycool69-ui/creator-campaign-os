import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NextStepCard } from "@/components/ui/next-step-card";
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
import { getCampaigns } from "@/lib/actions/campaigns";
import { isConfiguredEnv } from "@/lib/env";
import { filterNewToBrandByIdentity, getBrandProcessedIdentitySet } from "@/lib/utils/brand-creator-dedupe";

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

  const [brand, statusCounts, allCreators, campaigns] = await Promise.all([
    getBrandById(id),
    getLeadStatusCounts(id),
    getCreators(),
    getCampaigns(id),
  ]);

  if (!brand) {
    notFound();
  }

  // Fetch brand creators with optional filter
  const brandCreators = await getBrandCreators(
    id,
    statusFilter as LeadStatus | undefined
  );

  // Get creators not yet linked to this brand by ID, platform handle, or profile URL
  const processedIdentities = await getBrandProcessedIdentitySet(id);
  const availableCreators = filterNewToBrandByIdentity(processedIdentities, allCreators)
    .map((c) => ({ id: c.id, name: c.name, email: c.email }));

  const totalCount = Object.values(statusCounts).reduce(
    (sum, count) => sum + count,
    0
  );
  const engagedCount = statusCounts["engaged"] || 0;
  const contactedCount = statusCounts["contacted"] || 0;
  const activeCount = statusCounts["active"] || 0;
  const readyForDmCount =
    (statusCounts["discovered"] || 0) +
    (statusCounts["researching"] || 0) +
    (statusCounts["qualified"] || 0);
  const firstCampaign = campaigns[0];
  const nextStep = getLeadsNextStep({
    brandId: id,
    engagedCount,
    contactedCount,
    activeCount,
    readyForDmCount,
    totalCount,
    firstCampaignId: firstCampaign?.id,
  });

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
      <div>
        <h1 className="text-3xl font-bold">Leads</h1>
        <p className="text-muted-foreground mt-1">
          {totalCount} creators linked to {brand.name}
        </p>
      </div>

      <NextStepCard
        title="Find Creators"
        description="Start by finding creators for this brand. CSV import and manual add stay available as secondary paths."
        href="#discover-creators"
        actionLabel="Find Creators"
        primary
      />

      <div className="flex justify-end">
        <AddCreatorToBrandForm
          brandId={id}
          availableCreators={availableCreators}
        />
      </div>

      {/* Discovery section */}
      <div>
        <LeadDiscovery
          brandId={id}
          existingIdentityKeys={{
          platformHandles: Array.from(processedIdentities.platformHandles),
          profileUrls: Array.from(processedIdentities.profileUrls),
        }}
        aiConfig={{
          anthropic: isConfiguredEnv("ANTHROPIC_API_KEY"),
          brave: isConfiguredEnv("BRAVE_API_KEY"),
        }}
        />
      </div>

      <NextStepCard {...nextStep} />

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
            <LeadList
              brandId={id}
              firstCampaignId={firstCampaign?.id}
              brandCreators={brandCreators}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}


function getLeadsNextStep({
  brandId,
  engagedCount,
  contactedCount,
  activeCount,
  readyForDmCount,
  totalCount,
  firstCampaignId,
}: {
  brandId: string;
  engagedCount: number;
  contactedCount: number;
  activeCount: number;
  readyForDmCount: number;
  totalCount: number;
  firstCampaignId?: string;
}) {
  if (engagedCount > 0) {
    return {
      title: "Accept or add engaged creators",
      description: `${engagedCount} engaged creator${engagedCount === 1 ? " is" : "s are"} ready for a decision. Accept them, then move them into a campaign.`,
      href: `/brands/${brandId}/leads?status=engaged`,
      actionLabel: "Review Engaged",
    };
  }

  if (activeCount > 0) {
    return {
      title: "Add accepted creators to campaign",
      description: `${activeCount} accepted creator${activeCount === 1 ? " is" : "s are"} ready for campaign onboarding.`,
      href: firstCampaignId
        ? `/campaigns/${firstCampaignId}`
        : `/campaigns/new?brandId=${brandId}`,
      actionLabel: firstCampaignId ? "Open Campaign" : "Create Campaign",
    };
  }

  if (contactedCount > 0) {
    return {
      title: "Track replies",
      description: `${contactedCount} contacted creator${contactedCount === 1 ? " needs" : "s need"} reply tracking or follow-up.`,
      href: `/brands/${brandId}/track?tab=pending`,
      actionLabel: "Track Replies",
    };
  }

  if (readyForDmCount > 0) {
    return {
      title: "Send DMs",
      description: `${readyForDmCount} creator${readyForDmCount === 1 ? " is" : "s are"} ready for outreach.`,
      href: `/brands/${brandId}/send-dms`,
      actionLabel: "Send DMs",
    };
  }

  return {
    title: "Discover creators",
    description: totalCount > 0
      ? "No primary action is waiting. Discover or add more creators to keep building the funnel."
      : "No leads yet. Discover or add creators to start the funnel.",
    href: `/brands/${brandId}/leads`,
    actionLabel: "Find Creators",
  };
}
