import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlatformBadge } from "./platform-badge";

type CreatorPlatform = {
  id: string;
  platformId: string;
  handle: string;
  followerCount: number | null;
  verified: boolean | null;
};

type CreatorCardProps = {
  creator: {
    id: string;
    name: string;
    email: string | null;
    avatarUrl: string | null;
    country: string | null;
    tier: string | null;
    platforms: CreatorPlatform[];
  };
};

function getTierColor(tier: string | null): string {
  const colors: Record<string, string> = {
    nano: "bg-gray-100 text-gray-800",
    micro: "bg-blue-100 text-blue-800",
    mid: "bg-green-100 text-green-800",
    macro: "bg-purple-100 text-purple-800",
    mega: "bg-yellow-100 text-yellow-800",
  };
  return tier ? colors[tier] || "bg-secondary" : "bg-secondary";
}

export function CreatorCard({ creator }: CreatorCardProps) {
  const totalFollowers = creator.platforms.reduce(
    (sum, p) => sum + (p.followerCount || 0),
    0
  );

  return (
    <Link href={`/creators/${creator.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-semibold shrink-0">
              {creator.avatarUrl ? (
                <img
                  src={creator.avatarUrl}
                  alt={creator.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                creator.name.charAt(0).toUpperCase()
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{creator.name}</h3>
                {creator.tier && (
                  <Badge variant="secondary" className={getTierColor(creator.tier)}>
                    {creator.tier}
                  </Badge>
                )}
              </div>

              {creator.email && (
                <p className="text-sm text-muted-foreground truncate mb-2">
                  {creator.email}
                </p>
              )}

              {/* Platforms */}
              <div className="flex flex-wrap gap-1">
                {creator.platforms.slice(0, 3).map((platform) => (
                  <PlatformBadge
                    key={platform.id}
                    platformId={platform.platformId}
                    handle={platform.handle}
                    followerCount={platform.followerCount}
                    verified={platform.verified}
                  />
                ))}
                {creator.platforms.length > 3 && (
                  <Badge variant="outline">
                    +{creator.platforms.length - 3} more
                  </Badge>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="text-right shrink-0">
              {creator.country && (
                <span className="text-lg" title={creator.country}>
                  {getFlagEmoji(creator.country)}
                </span>
              )}
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
