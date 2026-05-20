"use client";

import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { analyzeBrandAction } from "@/lib/actions/brands";
import type { BrandAnalysis } from "@/lib/db/schema";

type Props = {
  brandId: string;
  hasWebsite: boolean;
  analysis: BrandAnalysis | null | undefined;
  analyzedAt: Date | null | undefined;
  aiConfigured: boolean;
};

export function BrandAnalysisCard({
  brandId,
  hasWebsite,
  analysis,
  analyzedAt,
  aiConfigured,
}: Props) {
  const { success, error } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleAnalyze() {
    if (!aiConfigured) return;
    startTransition(async () => {
      const result = await analyzeBrandAction(brandId);
      if (result.success) {
        success("Brand analyzed", "Creator profile updated.");
      } else {
        error("Analysis failed", result.error);
      }
    });
  }

  if (!hasWebsite) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Brand Analysis</CardTitle>
          {analyzedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Last analyzed {new Date(analyzedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={isPending || !aiConfigured}
          variant={analysis ? "outline" : "default"}
          size="sm"
        >
          {isPending ? "Analyzing…" : !aiConfigured ? "AI Not Configured" : analysis ? "Re-analyze" : "Analyze Brand"}
        </Button>
      </CardHeader>

      {!aiConfigured && (
        <CardContent>
          <p className="text-sm text-muted-foreground py-2">Add an Anthropic API key to enable brand analysis.</p>
        </CardContent>
      )}

      {isPending && (
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <span className="animate-spin">⟳</span>
            Reading website and generating profile…
          </div>
        </CardContent>
      )}

      {!isPending && analysis && (
        <CardContent className="space-y-4">
          {/* Summary */}
          <p className="text-sm text-muted-foreground">{analysis.summary}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left column */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Niche
                </p>
                <p className="text-sm">{analysis.niche}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Tone of Voice
                </p>
                <p className="text-sm">{analysis.toneOfVoice}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Target Audience
                </p>
                <p className="text-sm">{analysis.targetAudience}</p>
              </div>
            </div>

            {/* Right column — ideal creator profile */}
            <div className="space-y-3 border border-border rounded-lg p-3 bg-background/85">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Ideal Creator Profile
              </p>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Platforms</p>
                <div className="flex flex-wrap gap-1">
                  {analysis.idealCreatorProfile.platforms.map((p) => (
                    <Badge key={p} variant="secondary" className="capitalize text-xs">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Follower Range
                </p>
                <p className="text-sm font-medium">
                  {analysis.idealCreatorProfile.followerRange.min.toLocaleString()}
                  {" – "}
                  {analysis.idealCreatorProfile.followerRange.max.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Niche</p>
                <p className="text-sm">{analysis.idealCreatorProfile.niche}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Content Style
                </p>
                <p className="text-sm">
                  {analysis.idealCreatorProfile.contentStyle}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      )}

      {!isPending && !analysis && (
        <CardContent>
          <p className="text-sm text-muted-foreground py-2">
            Click "Analyze Brand" to generate a creator marketing profile from
            this brand's website.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
