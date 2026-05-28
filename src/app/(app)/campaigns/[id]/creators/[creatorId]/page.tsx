import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NextStepCard } from "@/components/ui/next-step-card";
import {
  PipelineStatusBadge,
  StatusMover,
  PipelineStatus,
} from "@/components/features/campaigns";
import { PlatformBadge } from "@/components/features/creators";
import { AgreementStatusBadge } from "@/components/features/agreements";
import { ShipmentStatusBadge } from "@/components/features/shipments";
import {
  createShopifyDiscountCodeForCampaignCreator,
  getCampaignCreatorById,
} from "@/lib/actions/campaign-creators";
import { getAgreement } from "@/lib/actions/agreements";
import { getShipment } from "@/lib/actions/shipments";
import { getContentStats } from "@/lib/actions/content";
import { getPortalUrl } from "@/lib/actions/creator-portal";
import { getShopifyIntegrationSettings } from "@/lib/actions/brands";

type Props = {
  params: Promise<{ id: string; creatorId: string }>;
};

// Statuses where agreement/shipment sections should show
const SHOW_AGREEMENT_STATUSES = [
  "accepted",
  "onboarding",
  "ready",
  "active",
  "completed",
];
const SHOW_SHIPMENT_STATUSES = ["onboarding", "ready", "active", "completed"];
const SHOW_CONTENT_STATUSES = ["ready", "creating", "in_review", "revision", "approved", "posting", "posted", "completed", "active"];

export default async function CampaignCreatorPage({ params }: Props) {
  const { id: campaignId, creatorId } = await params;

  const campaignCreator = await getCampaignCreatorById(creatorId);

  if (!campaignCreator) {
    notFound();
  }

  const { campaign, brandCreator } = campaignCreator;
  const { creator } = brandCreator;

  // Fetch agreement, shipment, and content stats if in appropriate status
  const showAgreement = SHOW_AGREEMENT_STATUSES.includes(campaignCreator.status);
  const showShipment = SHOW_SHIPMENT_STATUSES.includes(campaignCreator.status);
  const showContent = SHOW_CONTENT_STATUSES.includes(campaignCreator.status);

  const [agreement, shipment, contentStats, portalUrl, shopifyIntegration] = await Promise.all([
    showAgreement ? getAgreement(creatorId) : Promise.resolve(null),
    showShipment ? getShipment(creatorId) : Promise.resolve(null),
    showContent ? getContentStats(creatorId) : Promise.resolve(null),
    getPortalUrl(creatorId),
    getShopifyIntegrationSettings(campaign.brand.id),
  ]);

  const createShopifyCodeAction = async () => {
    "use server";
    await createShopifyDiscountCodeForCampaignCreator(creatorId);
  };

  const nextStep = getCreatorNextStep({
    campaignId,
    creatorId,
    status: campaignCreator.status,
    hasAgreement: !!agreement,
    hasShipment: !!shipment,
    contentStats,
    portalUrl,
  });

  // Calculate days in campaign
  const daysInCampaign = Math.floor(
    (Date.now() - new Date(campaignCreator.createdAt).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/campaigns" className="hover:text-foreground">
          Campaigns
        </Link>
        <span>/</span>
        <Link href={`/campaigns/${campaignId}`} className="hover:text-foreground">
          {campaign.name}
        </Link>
        <span>/</span>
        <span>{creator.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-6">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-card/70 border border-border flex items-center justify-center text-2xl font-semibold shrink-0">
          {creator.avatarUrl ? (
            <img
              src={creator.avatarUrl}
              alt={creator.name}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            creator.name.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{creator.name}</h1>
            <PipelineStatusBadge
              status={campaignCreator.status as PipelineStatus}
            />
            {creator.country && (
              <span className="text-2xl">{getFlagEmoji(creator.country)}</span>
            )}
          </div>
          {creator.email && (
            <p className="text-muted-foreground">{creator.email}</p>
          )}

          {/* Platforms */}
          <div className="flex flex-wrap gap-2 mt-3">
            {creator.platforms.map((platform) => (
              <PlatformBadge
                key={platform.id}
                platformId={platform.platformId}
                handle={platform.handle}
                followerCount={platform.followerCount}
                verified={platform.verified}
              />
            ))}
          </div>
        </div>

        {/* Quick link to global creator profile */}
        <Link
          href={`/creators/${creator.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          View Full Profile →
        </Link>
      </div>

      <NextStepCard {...nextStep} />

      {/* Status mover */}
      <Card id="pipeline-status">
        <CardHeader>
          <CardTitle>Pipeline Status</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusMover
            campaignCreatorId={campaignCreator.id}
            currentStatus={campaignCreator.status as PipelineStatus}
            variant="both"
          />
        </CardContent>
      </Card>

      {/* Affiliate / Discount Code */}
      <Card>
        <CardHeader>
          <CardTitle>Affiliate / Discount Code</CardTitle>
        </CardHeader>
        <CardContent>
          {campaignCreator.affiliateCode ? (
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-2xl font-bold tracking-wide">
                  {campaignCreator.affiliateCode}
                </div>
                <p className="text-sm text-muted-foreground">
                  Affiliate rate: {campaignCreator.affiliateRate ? `${campaignCreator.affiliateRate}%` : "—"}
                </p>
              </div>
              <Badge>Ready for Shopify tracking</Badge>
            </div>
          ) : shopifyIntegration.status === "connected" ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Create a unique Shopify discount code for this creator.
              </p>
              <form action={createShopifyCodeAction}>
                <Button type="submit" size="sm">
                  Create Shopify Code
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Connect Shopify for this brand before creating creator discount codes.
              </p>
              <Link href={`/brands/${campaign.brand.id}/settings`}>
                <Button variant="outline" size="sm">
                  Connect Shopify
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{daysInCampaign}</div>
            <p className="text-sm text-muted-foreground">Days in campaign</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {campaignCreator.rate
                ? `$${parseFloat(campaignCreator.rate).toLocaleString()}`
                : "—"}
            </div>
            <p className="text-sm text-muted-foreground">
              Rate {campaignCreator.rateType && `(${campaignCreator.rateType})`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {campaignCreator.deliverableCount || "—"}
            </div>
            <p className="text-sm text-muted-foreground">Deliverables</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold capitalize">
              {brandCreator.status}
            </div>
            <p className="text-sm text-muted-foreground">Lead status</p>
          </CardContent>
        </Card>
      </div>

      {/* Agreement Section */}
      {showAgreement && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>📝 Agreement</span>
              {agreement && (
                <AgreementStatusBadge status={agreement.status as any} />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agreement ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{agreement.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Created{" "}
                    {new Date(agreement.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <Link
                  href={`/campaigns/${campaignId}/creators/${creatorId}/agreement`}
                >
                  <Button variant="outline" size="sm">
                    View Agreement →
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                  No agreement created yet.
                </p>
                <Link
                  href={`/campaigns/${campaignId}/creators/${creatorId}/agreement`}
                >
                  <Button size="sm">Create Agreement</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Shipment Section */}
      {showShipment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>📦 Shipment</span>
              {shipment && (
                <ShipmentStatusBadge status={shipment.status as any} />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {shipment ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {shipment.carrier
                      ? `${shipment.carrier.toUpperCase()}`
                      : "Shipment"}
                    {shipment.trackingNumber && ` • ${shipment.trackingNumber}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Created{" "}
                    {new Date(shipment.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <Link
                  href={`/campaigns/${campaignId}/creators/${creatorId}/shipment`}
                >
                  <Button variant="outline" size="sm">
                    View Shipment →
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                  No shipment created yet.
                </p>
                <Link
                  href={`/campaigns/${campaignId}/creators/${creatorId}/shipment`}
                >
                  <Button size="sm">Create Shipment</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content Section */}
      {showContent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>📹 Content</span>
              {contentStats && contentStats.total > 0 && (
                <Badge variant="secondary">
                  {contentStats.total} piece{contentStats.total !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contentStats && contentStats.total > 0 ? (
              <div className="space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-background/85 border border-border rounded-lg p-2">
                    <div className="text-lg font-bold">{contentStats.total}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="bg-background/85 border border-border rounded-lg p-2">
                    <div className="text-lg font-bold">{contentStats.submitted}</div>
                    <div className="text-xs text-muted-foreground">In Review</div>
                  </div>
                  <div className="bg-background/85 border border-border rounded-lg p-2">
                    <div className="text-lg font-bold">{contentStats.approved}</div>
                    <div className="text-xs text-muted-foreground">Approved</div>
                  </div>
                  <div className="bg-background/85 border border-border rounded-lg p-2">
                    <div className="text-lg font-bold">{contentStats.posted}</div>
                    <div className="text-xs text-muted-foreground">Posted</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Link
                    href={`/campaigns/${campaignId}/creators/${creatorId}/content`}
                  >
                    <Button variant="outline" size="sm">
                      View All Content →
                    </Button>
                  </Link>
                  <Link
                    href={`/campaigns/${campaignId}/creators/${creatorId}/content/new`}
                  >
                    <Button size="sm">+ Internal Upload</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                  No content submitted yet. Send creators the portal link for uploads, or use internal upload for manual entry.
                </p>
                <Link
                  href={`/campaigns/${campaignId}/creators/${creatorId}/content/new`}
                >
                  <Button size="sm">Internal Upload</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {campaignCreator.shortlistedAt && (
              <TimelineItem
                label="Shortlisted"
                date={campaignCreator.shortlistedAt}
              />
            )}
            {campaignCreator.invitedAt && (
              <TimelineItem label="Invited" date={campaignCreator.invitedAt} />
            )}
            {campaignCreator.acceptedAt && (
              <TimelineItem label="Accepted" date={campaignCreator.acceptedAt} />
            )}
            {campaignCreator.readyAt && (
              <TimelineItem label="Ready" date={campaignCreator.readyAt} />
            )}
            {campaignCreator.completedAt && (
              <TimelineItem
                label="Completed"
                date={campaignCreator.completedAt}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {campaignCreator.notes ? (
            <p className="whitespace-pre-wrap">{campaignCreator.notes}</p>
          ) : (
            <p className="text-muted-foreground text-sm">No notes yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Brand relationship info */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Relationship</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{campaign.brand.name}</p>
              <p className="text-sm text-muted-foreground">
                Source: {brandCreator.source || "Unknown"}
              </p>
            </div>
            <Link href={`/brands/${campaign.brand.id}`}>
              <Badge variant="outline">View Brand →</Badge>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TimelineItem({ label, date }: { label: string; date: Date }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-2 h-2 rounded-full bg-primary" />
      <div className="flex-1">
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-sm text-muted-foreground">
        {new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}


type CreatorNextStepInput = {
  campaignId: string;
  creatorId: string;
  status: string;
  hasAgreement: boolean;
  hasShipment: boolean;
  contentStats: Awaited<ReturnType<typeof getContentStats>> | null;
  portalUrl: string;
};

function getCreatorNextStep({
  campaignId,
  creatorId,
  status,
  hasAgreement,
  hasShipment,
  contentStats,
  portalUrl,
}: CreatorNextStepInput) {
  const creatorHref = `/campaigns/${campaignId}/creators/${creatorId}`;

  if (!hasAgreement && ["accepted", "onboarding", "ready", "active", "completed"].includes(status)) {
    return {
      title: "Create Agreement",
      description: "Lock in deliverables, rate, usage rights, and terms before shipping product.",
      href: `${creatorHref}/agreement`,
      actionLabel: "Create Agreement",
    };
  }

  if (!hasShipment && ["onboarding", "ready", "active", "completed"].includes(status)) {
    return {
      title: "Create Shipment",
      description: "Create the shipment record so product delivery is tracked before content creation.",
      href: `${creatorHref}/shipment`,
      actionLabel: "Create Shipment",
    };
  }

  if ((contentStats?.submitted || 0) > 0) {
    return {
      title: "Review Content",
      description: "New content is waiting for approval, revision notes, or rejection.",
      href: `${creatorHref}/content`,
      actionLabel: "Review Content",
    };
  }

  if ((contentStats?.approved || 0) > 0) {
    return {
      title: "Mark Posted",
      description: "Approved content is ready to be marked posted once it goes live.",
      href: `${creatorHref}/content`,
      actionLabel: "Track Posting",
    };
  }

  if ((contentStats?.posted || 0) > 0 || ["posted", "completed"].includes(status)) {
    return {
      title: "Review Analytics",
      description: "Content has been posted. Review conversions and revenue impact.",
      href: "/analytics",
      actionLabel: "Review Analytics",
    };
  }

  if (hasShipment || ["ready", "creating"].includes(status)) {
    return {
      title: "Send Portal Link",
      description: "Send the creator portal link so content can be submitted for review.",
      href: portalUrl,
      actionLabel: "Open Portal Link",
    };
  }

  return {
    title: "Move Creator Forward",
    description: "Update the pipeline status when this creator is ready for the next campaign step.",
    href: `${creatorHref}#pipeline-status`,
    actionLabel: "Review Status",
  };
}
