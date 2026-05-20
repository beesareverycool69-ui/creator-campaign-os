import { Badge } from "@/components/ui/badge";

type PlatformBadgeProps = {
  platformId: string;
  handle: string;
  followerCount?: number | null;
  verified?: boolean | null;
};

function formatFollowers(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

function getPlatformColor(platformId: string): string {
  const colors: Record<string, string> = {
    instagram: "bg-gradient-to-r from-primary to-accent text-white border-0",
    tiktok: "bg-black text-white border-0",
    youtube: "bg-primary text-primary-foreground border-0",
    twitter: "bg-sky-500 text-white border-0",
    twitch: "bg-primary text-white border-0",
  };
  return colors[platformId] || "bg-secondary";
}

function getPlatformIcon(platformId: string): string {
  const icons: Record<string, string> = {
    instagram: "📸",
    tiktok: "🎵",
    youtube: "▶️",
    twitter: "🐦",
    twitch: "🎮",
  };
  return icons[platformId] || "🌐";
}

export function PlatformBadge({
  platformId,
  handle,
  followerCount,
  verified,
}: PlatformBadgeProps) {
  return (
    <Badge className={`${getPlatformColor(platformId)} gap-1`}>
      <span>{getPlatformIcon(platformId)}</span>
      <span>@{handle}</span>
      {verified && <span>✓</span>}
      {followerCount && (
        <span className="opacity-80">• {formatFollowers(followerCount)}</span>
      )}
    </Badge>
  );
}
