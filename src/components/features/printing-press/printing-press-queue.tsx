"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BriefForm } from "./brief-form";
import type { BrandCreatorWithDetails } from "@/lib/actions/brand-creators";
import { ChevronDown, ChevronUp, FileText, FileCheck } from "lucide-react";

type Brand = {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  brandAnalysis: any;
};

type Props = {
  brandId: string;
  brand: Brand;
  creators: BrandCreatorWithDetails[];
};

export function PrintingPressQueue({ brandId, brand, creators }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getStatus = (creator: BrandCreatorWithDetails) => {
    if (creator.notes?.includes("[POSTED]")) return "posted";
    if (creator.notes?.includes("[BRIEF_SENT]")) return "brief_sent";
    if (creator.notes?.includes("[READY_TO_SHIP]")) return "ready_to_ship";
    return "needs_brief";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "needs_brief":
        return <Badge className="bg-orange-500/20 text-primary border-orange-500/30">NEEDS BRIEF</Badge>;
      case "ready_to_ship":
        return <Badge className="bg-card/70 text-primary border-blue-500/30">READY TO SHIP</Badge>;
      case "brief_sent":
        return <Badge className="bg-primary/20 text-primary border-primary/30">BRIEF SENT</Badge>;
      case "posted":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">POSTED</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {creators.map((creator) => {
        const status = getStatus(creator);
        const isExpanded = expandedId === creator.id;
        const primaryPlatform = creator.creator.platforms[0];
        const handle = primaryPlatform?.handle;
        const followerCount = primaryPlatform?.followerCount;

        return (
          <Card key={creator.id} className={isExpanded ? "border-primary" : ""}>
            <CardContent className="p-4">
              {/* Creator header - clickable to expand */}
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : creator.id)}
              >
                <div className="flex items-center gap-4">
                  {creator.creator.avatarUrl ? (
                    <img 
                      src={creator.creator.avatarUrl} 
                      alt={creator.creator.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-card/70 border border-border flex items-center justify-center text-lg font-bold">
                      {creator.creator.name[0]}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{handle ? `@${handle}` : creator.creator.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {primaryPlatform?.platformId} • {followerCount ? `${(followerCount / 1000).toFixed(0)}K followers` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(status)}
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="mt-6 pt-6 border-t">
                  <BriefForm 
                    brandId={brandId}
                    brand={brand}
                    brandCreatorId={creator.id}
                    creator={creator.creator}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
