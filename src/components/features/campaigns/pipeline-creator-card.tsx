import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PlatformBadge } from "@/components/features/creators/platform-badge";

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
  const primaryPlatform = platforms.sort(
    (a, b) => (b.followerCount || 0) - (a.followerCount || 0)
  )[0];

  return (
    <Link href={`/campaigns/${campaignId}/creators/${campaignCreator.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-card/70 border border-border flex items-center justify-center text-sm font-semibold shrink-0">
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

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-medium text-sm truncate">
                  {creator.name}
                </span>
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
        </CardContent>
      </Card>
    </Link>
  );
}

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
