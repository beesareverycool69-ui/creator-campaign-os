import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CampaignStatusBadge,
  PipelineBoard,
  AddCreatorToCampaignForm,
  MAIN_PIPELINE_STAGES,
} from "@/components/features/campaigns";
import { getCampaignById } from "@/lib/actions/campaigns";
import {
  getCampaignCreators,
  getAvailableBrandCreatorsForCampaign,
} from "@/lib/actions/campaign-creators";
import { getCampaignContentSummary } from "@/lib/actions/content";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ brandCreatorId?: string; addCreator?: string }>;
};

export default async function CampaignPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { brandCreatorId, addCreator } = await searchParams;

  const [campaign, campaignCreators, contentSummary] = await Promise.all([
    getCampaignById(id),
    getCampaignCreators(id),
    getCampaignContentSummary(id),
  ]);

  if (!campaign || !campaign.brand) {
    notFound();
  }

  // Get available creators from this brand not yet in campaign
  const availableCreators = await getAvailableBrandCreatorsForCampaign(
    campaign.brand.id,
    id
  );

  const nextActionCreator = campaignCreators.find((creator) =>
    ["accepted", "onboarding", "ready", "shipped", "creating", "in_review", "approved", "posting"].includes(
      creator.status
    )
  );

  const commandCenterSteps = [
    {
      label: "Add accepted creators",
      description: "Bring accepted brand leads into this campaign as campaign creators.",
      count: campaign.totalCreators,
      action: "Add Creator",
      href: `/campaigns/${id}?addCreator=1`,
    },
    {
      label: "Onboard",
      description: "Move accepted creators through agreement, shipment, and readiness.",
      count:
        (campaign.statusCounts.accepted || 0) +
        (campaign.statusCounts.onboarding || 0) +
        (campaign.statusCounts.ready || 0),
      action: nextActionCreator ? "Open Creator" : "Review Pipeline",
      href: nextActionCreator
        ? `/campaigns/${id}/creators/${nextActionCreator.id}`
        : `/campaigns/${id}`,
    },
    {
      label: "Manage content",
      description: "Track creation, reviews, approvals, posting, and completion.",
      count:
        (campaign.statusCounts.creating || 0) +
        (campaign.statusCounts.in_review || 0) +
        (campaign.statusCounts.approved || 0) +
        (campaign.statusCounts.posting || 0) +
        (campaign.statusCounts.posted || 0),
      action: nextActionCreator ? "Open Creator" : "Review Content",
      href: nextActionCreator
        ? `/campaigns/${id}/creators/${nextActionCreator.id}`
        : `/campaigns/${id}`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/campaigns" className="hover:text-foreground">
          Campaigns
        </Link>
        <span>/</span>
        <span>{campaign.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Brand logo */}
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-lg font-semibold shrink-0">
            {campaign.brand.logoUrl ? (
              <img
                src={campaign.brand.logoUrl}
                alt={campaign.brand.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              campaign.brand.name.charAt(0).toUpperCase()
            )}
          </div>

          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold">{campaign.name}</h1>
              <CampaignStatusBadge status={campaign.status as any} />
            </div>
            <p className="text-muted-foreground">
              <Link
                href={`/brands/${campaign.brand.id}`}
                className="hover:underline"
              >
                {campaign.brand.name}
              </Link>
              {campaign.startDate && (
                <>
                  {" "}
                  • {formatDate(campaign.startDate)}
                  {campaign.endDate && ` - ${formatDate(campaign.endDate)}`}
                </>
              )}
            </p>
            {campaign.description && (
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                {campaign.description}
              </p>
            )}
          </div>
        </div>

        <AddCreatorToCampaignForm
          campaignId={id}
          availableCreators={availableCreators}
          preselectedBrandCreatorId={brandCreatorId}
          defaultOpen={addCreator === "1"}
        />
      </div>

      {/* Campaign command center */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign command center</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {commandCenterSteps.map((step) => (
              <div key={step.label} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{step.label}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {step.description}
                    </p>
                  </div>
                  <div className="text-2xl font-bold">{step.count}</div>
                </div>
                <Link href={step.href}>
                  <Button variant="outline" size="sm">{step.action}</Button>
                </Link>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Campaigns are the source of truth after a lead is accepted: add creators here, then manage agreements, shipment, content review, posting, and completion from each campaign creator page.
          </p>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
        {MAIN_PIPELINE_STAGES.map((status) => {
          const count = campaign.statusCounts[status] || 0;
          return (
            <Card key={status}>
              <CardContent className="pt-4 pb-4 text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {status}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Content Summary */}
      {contentSummary.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📹 Content Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{contentSummary.total}</div>
                <div className="text-sm text-muted-foreground">Total Submissions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {contentSummary.submitted}
                </div>
                <div className="text-sm text-muted-foreground">In Review</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {contentSummary.approved}
                </div>
                <div className="text-sm text-muted-foreground">Approved</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {contentSummary.posted}
                </div>
                <div className="text-sm text-muted-foreground">Posted</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline board */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Pipeline ({campaign.totalCreators} creators)
        </h2>

        {campaignCreators.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <h3 className="text-lg font-medium mb-2">No creators yet</h3>
            <p className="text-muted-foreground mb-4">
              Add creators from{" "}
              <Link
                href={`/brands/${campaign.brand.id}`}
                className="text-primary hover:underline"
              >
                {campaign.brand.name}
              </Link>{" "}
              to this campaign.
            </p>
          </div>
        ) : (
          <PipelineBoard campaignId={id} creators={campaignCreators} />
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
