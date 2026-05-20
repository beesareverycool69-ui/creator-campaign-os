"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { BrandCreatorWithDetails } from "@/lib/actions/brand-creators";
import { Package, Clock, FileVideo, CheckCircle, Play, ExternalLink, Copy } from "lucide-react";

type Props = {
  brandId: string;
  creators: BrandCreatorWithDetails[];
  uploadUrlsByBrandCreatorId: Record<string, string>;
};

type PipelineStage = "ship" | "awaiting" | "review" | "ready" | "posted";

type CreatorWithStage = BrandCreatorWithDetails & {
  stage: PipelineStage;
  trackingNumber?: string;
  deliveredAt?: Date;
  contentUrl?: string;
  postUrl?: string;
  tier?: "gold" | "silver" | "bronze";
};

export function AffiliatePipeline({ brandId, creators, uploadUrlsByBrandCreatorId }: Props) {
  // Parse stage from notes (simplified - would use proper DB field)
  const getStage = (c: BrandCreatorWithDetails): PipelineStage => {
    const notes = c.notes || "";
    if (notes.includes("[POSTED]")) return "posted";
    if (notes.includes("[APPROVED]")) return "ready";
    if (notes.includes("[CONTENT_RECEIVED]")) return "review";
    if (notes.includes("[DELIVERED]")) return "awaiting";
    return "ship";
  };

  const getTier = (c: BrandCreatorWithDetails): "gold" | "silver" | "bronze" => {
    const followers = c.creator.platforms[0]?.followerCount || 0;
    if (followers >= 100000) return "gold";
    if (followers >= 10000) return "silver";
    return "bronze";
  };

  const creatorsWithStage: CreatorWithStage[] = creators.map(c => ({
    ...c,
    stage: getStage(c),
    tier: getTier(c),
  }));

  const columns: { id: PipelineStage; title: string; icon: React.ReactNode; color: string }[] = [
    { id: "ship", title: "Ship Product", icon: <Package className="h-4 w-4" />, color: "text-primary" },
    { id: "awaiting", title: "Awaiting Content", icon: <Clock className="h-4 w-4" />, color: "text-primary" },
    { id: "review", title: "Review Content", icon: <FileVideo className="h-4 w-4" />, color: "text-primary" },
    { id: "ready", title: "Ready to Post", icon: <CheckCircle className="h-4 w-4" />, color: "text-green-500" },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {columns.map((column) => {
        const columnCreators = creatorsWithStage.filter(c => c.stage === column.id);
        
        return (
          <div key={column.id} className="space-y-3">
            {/* Column header */}
            <div className="flex items-center gap-2 pb-2 border-b">
              <span className={column.color}>{column.icon}</span>
              <span className="font-medium text-sm">{column.title}</span>
              <Badge variant="secondary" className="ml-auto">{columnCreators.length}</Badge>
            </div>

            {/* Cards */}
            <div className="space-y-3 min-h-[200px]">
              {columnCreators.map((creator) => (
                <PipelineCard 
                  key={creator.id} 
                  creator={creator} 
                  stage={column.id}
                  brandId={brandId}
                  uploadUrl={uploadUrlsByBrandCreatorId[creator.id]}
                />
              ))}

              {columnCreators.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No creators
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PipelineCard({ 
  creator, 
  stage,
  brandId,
  uploadUrl,
}: { 
  creator: CreatorWithStage; 
  stage: PipelineStage;
  brandId: string;
  uploadUrl?: string;
}) {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [showUploadLink, setShowUploadLink] = useState(false);

  const primaryPlatform = creator.creator.platforms[0];
  const handle = primaryPlatform?.handle;

  const tierColors = {
    gold: "bg-accent/20 text-primary border-yellow-500/30",
    silver: "bg-gray-400/20 text-gray-400 border-gray-400/30",
    bronze: "bg-orange-700/20 text-primary border-orange-700/30",
  };


  return (
    <Card className="bg-card/50">
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          {creator.creator.avatarUrl ? (
            <img 
              src={creator.creator.avatarUrl} 
              alt={creator.creator.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-card/70 border border-border flex items-center justify-center text-sm font-bold">
              {creator.creator.name[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{creator.creator.name}</p>
            <p className="text-xs text-muted-foreground">@{handle}</p>
          </div>
          <Badge variant="outline" className="text-xs">Camp #1</Badge>
        </div>

        {/* Brand & Tier */}
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary" className="text-xs">Kingdom Nutrition</Badge>
          {creator.tier && (
            <Badge className={`text-xs ${tierColors[creator.tier]}`}>
              {creator.tier === "gold" ? "🥇" : creator.tier === "silver" ? "🥈" : "🥉"} {creator.tier}
            </Badge>
          )}
        </div>

        {/* Stage-specific content */}
        {stage === "ship" && (
          <div className="space-y-2">
            <Input 
              placeholder="Enter Tracking #"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="h-8 text-xs"
            />
            <Button size="sm" className="w-full h-7 text-xs bg-accent hover:bg-yellow-600 text-black">
              Enter Tracking #
            </Button>
          </div>
        )}

        {stage === "awaiting" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Delivered 2026-02-23
            </p>
            <div className="flex items-center gap-1 text-xs text-green-500">
              <CheckCircle className="h-3 w-3" />
              Upload link sent ✓
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full h-7 text-xs"
              disabled={!uploadUrl}
              onClick={() => setShowUploadLink(!showUploadLink)}
            >
              {uploadUrl ? "Copy Upload Link" : "No Upload Link"}
            </Button>
            {showUploadLink && uploadUrl && (
              <div className="flex items-center gap-1 p-2 bg-muted rounded text-xs">
                <code className="flex-1 truncate">{uploadUrl}</code>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 w-6 p-0"
                  onClick={() => navigator.clipboard.writeText(uploadUrl)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        )}

        {stage === "review" && (
          <div className="space-y-2">
            {/* Video thumbnail placeholder */}
            <div className="aspect-video bg-muted rounded flex items-center justify-center">
              <Play className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">+7 more files</p>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-7 text-xs bg-green-500 hover:bg-green-600">
                Approve
              </Button>
              <Button size="sm" variant="outline" className="flex-1 h-7 text-xs">
                Edits
              </Button>
            </div>
          </div>
        )}

        {stage === "ready" && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              5d in stage
            </p>
            <p className="text-xs font-medium">
              $680 • 12 orders
            </p>
            <Button size="sm" className="w-full h-7 text-xs bg-green-500 hover:bg-green-600">
              Mark as Posted
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
