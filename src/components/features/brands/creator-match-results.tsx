"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  matchCreatorsAction,
  addCreatorToBrandWithScore,
  discoverAndScoreCreatorsAction,
} from "@/lib/actions/brands";
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
  discoveryConfigured?: boolean;
  suggestedSearchTerms?: string[];
};

function scoreColor(score: number) {
  if (score >= 75) return "bg-primary/10 text-primary";
  if (score >= 50) return "bg-secondary text-primary";
  return "bg-secondary text-primary";
}

function MatchRow({ match, brandId }: { match: Match; brandId: string }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    startTransition(async () => {
      try {
        if (match.source === "discovered" && match.discoveredCreator) {
          const response = await fetch(`/api/brands/${brandId}/import-creators`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ creators: [match.discoveredCreator] }),
          });

          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || "Could not add this creator.");
          }
        } else {
          await addCreatorToBrandWithScore(brandId, match.creatorId, match.fitScore);
        }

        setAdded(true);
        router.refresh();
        success("Creator added", `${match.name} was added to this brand.`);
      } catch (err) {
        error("Failed to add creator", err instanceof Error ? err.message : "Please try again.");
      }
    });
  }

  const profileUrl = match.platforms.find((p) => p.profileUrl)?.profileUrl;
  const isLinkedToBrand = match.source === "saved" || added;

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
        {isLinkedToBrand ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-right space-y-2">
            <p className="text-sm font-medium text-primary">Added to this brand</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Link
                href={`/brands/${brandId}/send-dms`}
                className={buttonVariants({ size: "sm" })}
              >
                Send DM
              </Link>
              <Link
                href={`/brands/${brandId}/leads`}
                className={buttonVariants({ size: "sm", variant: "outline" })}
              >
                View in Leads
              </Link>
            </div>
          </div>
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
  discoveryConfigured = false,
  suggestedSearchTerms = DEFAULT_SEARCH_TERMS,
}: Props) {
  const { success, error: showError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<number>(10);
  const [phase, setPhase] = useState<"matching" | "discovering" | null>(null);

  function handleMatch() {
    if (!aiConfigured) return;
    setMatches(null);
    setError(null);
    startTransition(async () => {
      setPhase("matching");
      const result = await matchCreatorsAction(brandId, limit);
      if (!result.success) {
        setPhase(null);
        setError(result.error);
        showError("Matching failed", result.error);
        return;
      }

      if (result.matches.length > 0 || !discoveryConfigured) {
        setPhase(null);
        setMatches(result.matches);
        success("Matching complete", `Found ${result.matches.length} qualified match${result.matches.length !== 1 ? "es" : ""}.`);
        return;
      }

      setPhase("discovering");
      const discovered = await discoverAndScoreCreatorsAction(brandId, suggestedSearchTerms, limit);
      setPhase(null);

      if (discovered.success) {
        setMatches(discovered.matches);
        success(
          "Matching complete",
          discovered.matches.length > 0
            ? `Found ${discovered.matches.length} discovered candidate${discovered.matches.length !== 1 ? "s" : ""}.`
            : "No qualified creator matches found."
        );
      } else {
        setError(discovered.error);
        showError("Discovery failed", discovered.error);
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
            Match saved creators first. If no strong matches are found, Creator Matching will search and score new creator candidates automatically.
          </p>
        )}

        {isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <span className="animate-spin">⟳</span>
            {phase === "discovering" ? "Searching and scoring creators…" : "Finding qualified brand matches…"}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive py-2">{error}</p>
        )}

        {matches && matches.length === 0 && (
          <div className="rounded-lg border border-border bg-card/70 p-4 space-y-3">
            <div>
              <p className="text-sm font-medium">No strong creator matches found.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Creator Matching checked saved creators and searched for new candidates, but did not find strong matches. Try a deeper discovery search.
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
              Open Discover Creators
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
