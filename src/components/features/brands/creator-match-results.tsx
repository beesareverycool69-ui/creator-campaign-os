"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { matchCreatorsAction, addCreatorToBrandWithScore } from "@/lib/actions/brands";
import type { MatchCreatorsResult } from "@/lib/actions/brands";

const LIMIT_OPTIONS = [10, 50, 100, 200] as const;

type Match = Extract<MatchCreatorsResult, { success: true }>["matches"][number];

type Props = {
  brandId: string;
  hasAnalysis: boolean;
};

function scoreColor(score: number) {
  if (score >= 75) return "bg-green-100 text-green-800";
  if (score >= 50) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

function MatchRow({ match, brandId }: { match: Match; brandId: string }) {
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    startTransition(async () => {
      try {
        await addCreatorToBrandWithScore(brandId, match.creatorId, match.fitScore);
        setAdded(true);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to add creator.");
      }
    });
  }

  const topPlatform = match.platforms[0];

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
      {/* Score */}
      <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${scoreColor(match.fitScore)}`}>
        {match.fitScore}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">{match.name}</span>
          {match.platforms.map((p) => (
            <Badge key={p.platformId} variant="secondary" className="capitalize text-xs">
              {p.platformId}
              {p.followerCount ? ` · ${(p.followerCount / 1000).toFixed(0)}k` : ""}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{match.reason}</p>
      </div>

      {/* Action */}
      <div className="shrink-0">
        {added ? (
          <span className="text-sm text-green-600 font-medium">Added ✓</span>
        ) : (
          <Button size="sm" variant="outline" onClick={handleAdd} disabled={isPending}>
            {isPending ? "Adding…" : "Add to Brand"}
          </Button>
        )}
      </div>
    </div>
  );
}

export function CreatorMatchResults({ brandId, hasAnalysis }: Props) {
  const [isPending, startTransition] = useTransition();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<number>(10);

  function handleMatch() {
    setMatches(null);
    setError(null);
    startTransition(async () => {
      const result = await matchCreatorsAction(brandId, limit);
      if (result.success) {
        setMatches(result.matches);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Creator Matching</CardTitle>
          {matches && (
            <p className="text-xs text-muted-foreground mt-1">
              {matches.length} creator{matches.length !== 1 ? "s" : ""} scored
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(limit)}
            onChange={(e) => setLimit(Number(e.target.value))}
            disabled={isPending || !hasAnalysis}
            className="w-24 h-8 text-sm py-0"
          >
            {LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>Top {n}</option>
            ))}
          </Select>
          <Button
            onClick={handleMatch}
            disabled={isPending || !hasAnalysis}
            variant={matches ? "outline" : "default"}
            size="sm"
            title={!hasAnalysis ? "Analyze brand first" : undefined}
          >
            {isPending ? "Matching…" : matches ? "Re-match" : "Find Matches"}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!hasAnalysis && (
          <p className="text-sm text-muted-foreground py-2">
            Analyze the brand first to enable creator matching.
          </p>
        )}

        {hasAnalysis && !isPending && !matches && !error && (
          <p className="text-sm text-muted-foreground py-2">
            Score all creators in your database against this brand's ideal creator profile.
          </p>
        )}

        {isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <span className="animate-spin">⟳</span>
            Scoring creators against brand profile…
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive py-2">{error}</p>
        )}

        {matches && matches.length > 0 && (
          <div className="space-y-2">
            {matches.map((match) => (
              <MatchRow key={match.creatorId} match={match} brandId={brandId} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
