import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlatformBadge } from "@/components/features/creators/platform-badge";

export type CampaignCreatorNextAction = {
  label: string;
  href: string;
};

type PipelineCreatorCardProps = {
  campaignId: string;
  campaignCreator: {
    id: string;
    status: string;
    createdAt: Date;
    creator: {
      id: string;
      name: string;
      avatarUrl: string | null;
      country: string | null;
    };
    platforms: {
      id: string;
      platformId: string;
      handle: string;
      followerCount: number | null;
    }[];
  };
  statusChangedAt?: Date | null;
};

export function PipelineCreatorCard({
  campaignId,
  campaignCreator,
  statusChangedAt,
}: PipelineCreatorCardProps) {
  const { creator, platforms } = campaignCreator;
  const creatorHref = `/campaigns/${campaignId}/creators/${campaignCreator.id}`;
  const nextAction = getCampaignCreatorNextAction(
    campaignId,
    campaignCreator.id,
    campaignCreator.status
  );

  // Calculate days in current status
  const daysInStatus = statusChangedAt
    ? Math.floor(
        (Date.now() - new Date(statusChangedAt).getTime()) / (1000 * 60 * 60 * 24)
      )
    : Math.floor(
        (Date.now() - new Date(campaignCreator.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
      );

  // Primary platform (first one with most followers)
  const primaryPlatform = [...platforms].sort(
    (a, b) => (b.followerCount || 0) - (a.followerCount || 0)
  )[0];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Link href={creatorHref} className="shrink-0">
            <div className="w-10 h-10 rounded-full bg-card/70 border border-border flex items-center justify-center text-sm font-semibold hover:ring-2 ring-primary transition-all">
              {creator.avatarUrl ? (
                <img
                  src={creator.avatarUrl}
                  alt={creator.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                creator.name.charAt(0).toUpperCase()
              )}
            </div>
          </Link>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <Link href={creatorHref} className="font-medium text-sm truncate hover:underline">
                {creator.name}
              </Link>
              {creator.country && (
                <span className="text-xs">{getFlagEmoji(creator.country)}</span>
              )}
            </div>

            {/* Primary platform */}
            {primaryPlatform && (
              <div className="mt-1">
                <PlatformBadge
                  platformId={primaryPlatform.platformId}
                  handle={primaryPlatform.handle}
                  followerCount={primaryPlatform.followerCount}
                />
              </div>
            )}

            {/* Days in status */}
            <div className="text-xs text-muted-foreground mt-2">
              {daysInStatus === 0
                ? "Today"
                : daysInStatus === 1
                ? "1 day"
                : `${daysInStatus} days`}
            </div>
          </div>
        </div>

        <Link href={nextAction.href}>
          <Button size="sm" className="w-full">
            {nextAction.label}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function getCampaignCreatorNextAction(
  campaignId: string,
  campaignCreatorId: string,
  status: string
): CampaignCreatorNextAction {
  const creatorHref = `/campaigns/${campaignId}/creators/${campaignCreatorId}`;

  switch (status) {
    case "shortlisted":
      return { label: "Start Onboarding", href: creatorHref };
    case "invited":
      return { label: "Review Agreement", href: creatorHref };
    case "negotiating":
      return { label: "Continue Negotiation", href: creatorHref };
    case "accepted":
      return { label: "Create Agreement", href: `${creatorHref}/agreement` };
    case "onboarding":
      return { label: "Create Shipment", href: `${creatorHref}/shipment` };
    case "ready":
      return { label: "Send Portal Link", href: `${creatorHref}/content` };
    case "shipped":
      return { label: "Track Shipment", href: `${creatorHref}/shipment` };
    case "creating":
      return { label: "Review Submitted Content", href: `${creatorHref}/content` };
    case "in_review":
      return { label: "Review Content", href: `${creatorHref}/content` };
    case "approved":
    case "posting":
      return { label: "Mark Posted", href: `${creatorHref}/content` };
    case "posted":
      return { label: "Review Analytics", href: "/analytics" };
    case "completed":
      return { label: "View Summary", href: creatorHref };
    default:
      return { label: "Open Creator", href: creatorHref };
  }
}

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
