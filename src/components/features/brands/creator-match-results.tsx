"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { matchCreatorsAction, addCreatorToBrandWithScore } from "@/lib/actions/brands";
import type { MatchCreatorsResult } from "@/lib/actions/brands";

const LIMIT_OPTIONS = [10, 50, 100, 200] as const;
const DEFAULT_SEARCH_TERMS = [
  "food creators",
  "snack reviews",
  "taste tests",
  "flavor reviews",
];

type Match = Extract<MatchCreatorsResult, { success: true }>["matches"][number];

type Props = {
  brandId: string;
  hasAnalysis: boolean;
  aiConfigured: boolean;
  suggestedSearchTerms?: string[];
};

function scoreColor(score: number) {
  if (score >= 75) return "bg-primary/10 text-primary";
  if (score >= 50) return "bg-secondary text-primary";
  return "bg-secondary text-primary";
}

function MatchRow({ match, brandId }: { match: Match; brandId: string }) {
  const { success, error } = useToast();
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    startTransition(async () => {
      try {
        await addCreatorToBrandWithScore(brandId, match.creatorId, match.fitScore);
        setAdded(true);
        success("Creator added", `${match.name} was added to this brand.`);
      } catch (err) {
        error("Failed to add creator", err instanceof Error ? err.message : "Please try again.");
      }
    });
  }

  const profileUrl = match.platforms.find((p) => p.profileUrl)?.profileUrl;

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
      {/* Score */}
      <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${scoreColor(match.fitScore)}`}>
        {match.fitScore}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-medium">{match.name}</span>
          {match.platforms.map((p) => {
            const badge = (
              <Badge variant="secondary" className="capitalize text-xs">
                {p.platformId}
                {p.followerCount ? ` · ${(p.followerCount / 1000).toFixed(0)}k` : ""}
              </Badge>
            );

            return p.profileUrl ? (
              <a
                key={p.platformId}
                href={p.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${match.name}'s ${p.platformId} profile`}
              >
                {badge}
              </a>
            ) : (
              <span key={p.platformId}>{badge}</span>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground">{match.reason}</p>
      </div>

      {/* Action */}
      <div className="shrink-0 flex flex-col items-end gap-2">
        {profileUrl && (
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            Open Profile
          </a>
        )}
        {added ? (
          <span className="text-sm text-primary font-medium">Added ✓</span>
        ) : (
          <Button size="sm" variant="outline" onClick={handleAdd} disabled={isPending}>
            {isPending ? "Adding…" : "Add to Brand"}
          </Button>
        )}
      </div>
    </div>
  );
}

export function CreatorMatchResults({
  brandId,
  hasAnalysis,
  aiConfigured,
  suggestedSearchTerms = DEFAULT_SEARCH_TERMS,
}: Props) {
  const { success, error: showError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<number>(10);

  function handleMatch() {
    if (!aiConfigured) return;
    setMatches(null);
    setError(null);
    startTransition(async () => {
      const result = await matchCreatorsAction(brandId, limit);
      if (result.success) {
        setMatches(result.matches);
        success("Matching complete", `Found ${result.matches.length} qualified match${result.matches.length !== 1 ? "es" : ""}.`);
      } else {
        setError(result.error);
        showError("Matching failed", result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Creator Matching</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Rank creators already saved to this brand against the ideal creator profile.
          </p>
          {matches && (
            <p className="text-xs text-muted-foreground mt-1">
              {matches.length} qualified match{matches.length !== 1 ? "es" : ""} found
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(limit)}
            onChange={(e) => setLimit(Number(e.target.value))}
            disabled={isPending || !hasAnalysis || !aiConfigured}
            className="w-24 h-8 text-sm py-0"
          >
            {LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>Best {n}</option>
            ))}
          </Select>
          <Button
            onClick={handleMatch}
            disabled={isPending || !hasAnalysis || !aiConfigured}
            variant={matches ? "outline" : "default"}
            size="sm"
            title={!hasAnalysis ? "Analyze brand first" : undefined}
          >
            {isPending ? "Matching…" : !aiConfigured ? "AI Not Configured" : matches ? "Re-match" : "Find Matches"}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!aiConfigured && (
          <p className="text-sm text-muted-foreground py-2">
            Add an Anthropic API key to enable creator matching.
          </p>
        )}

        {aiConfigured && !hasAnalysis && (
          <p className="text-sm text-muted-foreground py-2">
            Analyze the brand first to enable creator matching.
          </p>
        )}

        {hasAnalysis && !isPending && !matches && !error && (
          <p className="text-sm text-muted-foreground py-2">
            Match and rank creators already saved to this brand. To find new creators, use Discover Creators first.
          </p>
        )}

        {isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <span className="animate-spin">⟳</span>
            Finding qualified brand matches…
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive py-2">{error}</p>
        )}

        {matches && matches.length === 0 && (
          <div className="rounded-lg border border-border bg-card/70 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium">No strong matches found in creators saved to this brand.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Matching only reviews creators already saved to this brand. Discover and save more brand-relevant creators, then run matching again.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Suggested searches
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedSearchTerms.slice(0, 8).map((term) => (
                  <Badge key={term} variant="secondary" className="text-xs">
                    {term}
                  </Badge>
                ))}
              </div>
            </div>

            <a
              href={`/brands/${brandId}/leads`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              Discover creators to add
            </a>
          </div>
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
