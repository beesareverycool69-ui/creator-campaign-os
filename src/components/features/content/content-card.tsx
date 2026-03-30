"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ContentStatusBadge, ContentStatus } from "./content-status-badge";

type ContentCardProps = {
  id: string;
  campaignId: string;
  campaignCreatorId: string;
  type: string;
  title: string | null;
  thumbnailUrl: string | null;
  fileUrls: string[] | null;
  status: ContentStatus;
  revisionCount: number | null;
  postedAt: Date | null;
  createdAt: Date;
  platformId: string | null;
};

const TYPE_ICONS: Record<string, string> = {
  post: "📷",
  story: "📱",
  reel: "🎬",
  video: "🎥",
  short: "⚡",
  tweet: "🐦",
  other: "📄",
};

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "📸",
  tiktok: "🎵",
  youtube: "📺",
  twitter: "🐦",
  facebook: "📘",
  linkedin: "💼",
};

export function ContentCard({
  id,
  campaignId,
  campaignCreatorId,
  type,
  title,
  thumbnailUrl,
  fileUrls,
  status,
  revisionCount,
  postedAt,
  createdAt,
  platformId,
}: ContentCardProps) {
  const typeIcon = TYPE_ICONS[type] || TYPE_ICONS.other;
  const platformIcon = platformId ? PLATFORM_ICONS[platformId] || "" : "";
  
  // Get first file URL for preview if no thumbnail
  const previewUrl = thumbnailUrl || (fileUrls && fileUrls[0]) || null;
  const isVideo = previewUrl?.match(/\.(mp4|mov|webm|avi)$/i);

  return (
    <Link
      href={`/campaigns/${campaignId}/creators/${campaignCreatorId}/content/${id}`}
    >
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardContent className="p-0">
          {/* Thumbnail/Preview */}
          <div className="aspect-video bg-muted relative overflow-hidden rounded-t-lg">
            {previewUrl ? (
              isVideo ? (
                <video
                  src={previewUrl}
                  className="w-full h-full object-cover"
                  muted
                />
              ) : (
                <img
                  src={previewUrl}
                  alt={title || "Content preview"}
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground">
                {typeIcon}
              </div>
            )}
            
            {/* Type badge overlay */}
            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <span>{typeIcon}</span>
              <span className="capitalize">{type}</span>
            </div>

            {/* Revision count if any */}
            {revisionCount && revisionCount > 0 && (
              <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                {revisionCount} revision{revisionCount > 1 ? "s" : ""}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">
                  {title || `${type.charAt(0).toUpperCase() + type.slice(1)} Content`}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {platformIcon} {platformId || "No platform"}
                </p>
              </div>
              <ContentStatusBadge status={status} showEmoji={false} />
            </div>

            <div className="text-xs text-muted-foreground">
              {postedAt ? (
                <span>
                  Posted{" "}
                  {new Date(postedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              ) : (
                <span>
                  Submitted{" "}
                  {new Date(createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
