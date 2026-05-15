"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { updateLeadStatus, type BrandCreatorWithDetails } from "@/lib/actions/brand-creators";
import { Check, X, ExternalLink, Clock } from "lucide-react";

type Props = {
  brandId: string;
  leads: BrandCreatorWithDetails[];
  currentTab: string;
};

export function TrackList({ brandId, leads, currentTab }: Props) {
  return (
    <div className="space-y-3">
      {leads.map((lead) => (
        <TrackCard 
          key={lead.id} 
          brandId={brandId}
          lead={lead} 
          currentTab={currentTab}
        />
      ))}
    </div>
  );
}

function TrackCard({ 
  brandId,
  lead, 
  currentTab 
}: { 
  brandId: string;
  lead: BrandCreatorWithDetails; 
  currentTab: string;
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showBriefPrompt, setShowBriefPrompt] = useState(false);

  const primaryPlatform = lead.creator.platforms[0];
  const handle = primaryPlatform?.handle;
  const followerCount = primaryPlatform?.followerCount;
  const profileUrl = getProfileUrl(primaryPlatform);

  const handleAccept = () => {
    startTransition(async () => {
      try {
        await updateLeadStatus(lead.id, "active");
        success("Lead accepted", "Creator moved to active partnerships.");
        setShowBriefPrompt(true);
      } catch (err) {
        error("Failed to update lead", err instanceof Error ? err.message : "Please try again.");
      }
    });
  };

  const handleDecline = () => {
    startTransition(async () => {
      try {
        await updateLeadStatus(lead.id, "churned");
        success("Lead declined", "Lead moved to declined.");
        router.refresh();
      } catch (err) {
        error("Failed to update lead", err instanceof Error ? err.message : "Please try again.");
      }
    });
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  const getStatusBadge = () => {
    if (lead.status === "contacted" && !lead.lastContactedAt) {
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">DM SENT</Badge>;
    }
    if (lead.status === "contacted") {
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">FOLLOW-UP 1</Badge>;
    }
    return null;
  };

  const daysSinceContact = lead.lastContactedAt 
    ? Math.floor((Date.now() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (showBriefPrompt) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium">@{handle} accepted!</p>
                <p className="text-sm text-muted-foreground">Their first campaign is ready in The Printing Press</p>
              </div>
            </div>
            <Button 
              onClick={() => router.push(`/brands/${brandId}/printing-press`)}
              className="bg-green-500 hover:bg-green-600"
            >
              Generate Content Brief →
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {lead.creator.avatarUrl ? (
              <img 
                src={lead.creator.avatarUrl} 
                alt={lead.creator.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold">
                {lead.creator.name[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{handle ? `@${handle}` : lead.creator.name}</h3>
                {getStatusBadge()}
              </div>
              <p className="text-sm text-muted-foreground">
                {lead.creator.name} • Sent: {lead.firstContactedAt?.toLocaleDateString()}
              </p>
              {lead.creator.platforms[0] && (
                <p className="text-xs text-muted-foreground">
                  {lead.creator.platforms.map(p => p.platformId).join(", ")}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Tags */}
            <div className="flex items-center gap-2">
              {primaryPlatform && (
                <Badge variant="secondary">{primaryPlatform.platformId}</Badge>
              )}
              {followerCount && (
                <Badge variant="outline">{formatFollowers(followerCount)}</Badge>
              )}
            </div>

            {profileUrl ? (
              <a href={profileUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" type="button">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Profile
                </Button>
              </a>
            ) : (
              <Button variant="outline" type="button" disabled>
                No profile linked
              </Button>
            )}

            {/* Actions based on tab */}
            {currentTab === "pending" && (
              <div className="flex gap-2">
                <Button 
                  onClick={handleAccept}
                  disabled={isPending}
                  variant="outline"
                  className="text-green-500 border-green-500/30 hover:bg-green-500/10"
                >
                  Accepted
                </Button>
                <Button 
                  onClick={handleDecline}
                  disabled={isPending}
                  variant="outline"
                  className="text-muted-foreground hover:text-red-500 hover:border-red-500/30"
                >
                  Declined
                </Button>
              </div>
            )}

            {currentTab === "accepted" && (
              <Button 
                onClick={() => router.push(`/brands/${brandId}/printing-press`)}
                variant="outline"
              >
                View Campaign →
              </Button>
            )}

            {currentTab === "declined" && daysSinceContact && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Re-engage in {90 - daysSinceContact} days
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getProfileUrl(platform?: { platformId: string; handle: string | null } | null) {
  const handle = platform?.handle?.replace(/^@/, "");
  if (!platform || !handle) return null;

  switch (platform.platformId) {
    case "instagram":
      return `https://instagram.com/${handle}`;
    case "tiktok":
      return `https://tiktok.com/@${handle}`;
    case "youtube":
      return `https://youtube.com/@${handle}`;
    case "twitter":
    case "x":
    case "x_twitter":
      return `https://x.com/${handle}`;
    default:
      return null;
  }
}
