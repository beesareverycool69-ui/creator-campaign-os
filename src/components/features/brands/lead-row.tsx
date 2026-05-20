"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { PlatformBadge } from "@/components/features/creators/platform-badge";
import {
  LeadStatusBadge,
  LeadStatus,
  getLeadStatusOptions,
} from "./lead-status-badge";
import { updateLeadStatus } from "@/lib/actions/brand-creators";
import {
  generateOutreachAction,
  generateFollowUpAction,
  updateOutreachMessageAction,
} from "@/lib/actions/outreach";

type LeadRowProps = {
  followUpDaysThreshold?: number;
  brandCreator: {
    id: string;
    status: LeadStatus;
    source: string | null;
    firstContactedAt: Date | null;
    lastContactedAt: Date | null;
    creator: {
      id: string;
      name: string;
      email: string | null;
      avatarUrl: string | null;
      country: string | null;
      tier: string | null;
      platforms: {
        id: string;
        platformId: string;
        handle: string;
        followerCount: number | null;
      }[];
    };
  };
};

export function LeadRow({ brandCreator, followUpDaysThreshold = 3 }: LeadRowProps) {
  const router = useRouter();
  const { success, error } = useToast();
  const [status, setStatus] = useState<LeadStatus>(brandCreator.status);
  const [updating, setUpdating] = useState(false);

  // Outreach generation state
  const [isGenerating, startGenerating] = useTransition();
  const [outreachId, setOutreachId] = useState<string | null>(null);
  const [outreachMessage, setOutreachMessage] = useState<string | null>(null);
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Follow-up state
  const [isGeneratingFollowUp, startGeneratingFollowUp] = useTransition();
  const [followUpId, setFollowUpId] = useState<string | null>(null);
  const [followUpMessage, setFollowUpMessage] = useState<string | null>(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [isSavingFollowUp, startSavingFollowUp] = useTransition();
  const [followUpSaved, setFollowUpSaved] = useState(false);
  const [followUpCopied, setFollowUpCopied] = useState(false);

  async function handleStatusChange(newStatus: LeadStatus) {
    if (newStatus === status) return;

    setUpdating(true);
    try {
      await updateLeadStatus(brandCreator.id, newStatus);
      setStatus(newStatus);
      success("Lead status updated", `Status changed to ${newStatus}.`);
      router.refresh();
    } catch (err) {
      console.error("Failed to update status:", err);
      error("Failed to update status", err instanceof Error ? err.message : "Please try again.");
      // Revert on error
      setStatus(brandCreator.status);
    } finally {
      setUpdating(false);
    }
  }

  function handleGenerate() {
    setOutreachOpen(true);
    setSaved(false);
    startGenerating(async () => {
      const result = await generateOutreachAction(brandCreator.id);
      if (result.success) {
        setOutreachId(result.outreachId);
        setOutreachMessage(result.message);
        success("DM generated", `Message ready for ${creator.name}.`);
      } else {
        error("Failed to generate message", result.error);
        setOutreachOpen(false);
      }
    });
  }

  function handleSave() {
    if (!outreachId || !outreachMessage) return;
    setSaved(false);
    startSaving(async () => {
      const result = await updateOutreachMessageAction(outreachId, outreachMessage);
      if (result.success) {
        setSaved(true);
        success("Draft saved", "Outreach message updated.");
      } else {
        error("Failed to save", result.error);
      }
    });
  }

  function handleCopy() {
    if (!outreachMessage) return;
    navigator.clipboard.writeText(outreachMessage);
    success("Copied", "DM copied to clipboard.");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleGenerateFollowUp() {
    setFollowUpOpen(true);
    setFollowUpSaved(false);
    startGeneratingFollowUp(async () => {
      const result = await generateFollowUpAction(brandCreator.id);
      if (result.success) {
        setFollowUpId(result.outreachId);
        setFollowUpMessage(result.message);
        success("Follow-up generated", `Message ready for ${creator.name}.`);
      } else {
        error("Failed to generate follow-up", result.error);
        setFollowUpOpen(false);
      }
    });
  }

  function handleSaveFollowUp() {
    if (!followUpId || !followUpMessage) return;
    setFollowUpSaved(false);
    startSavingFollowUp(async () => {
      const result = await updateOutreachMessageAction(followUpId, followUpMessage);
      if (result.success) {
        setFollowUpSaved(true);
        success("Draft saved", "Follow-up message updated.");
      } else {
        error("Failed to save", result.error);
      }
    });
  }

  function handleCopyFollowUp() {
    if (!followUpMessage) return;
    navigator.clipboard.writeText(followUpMessage);
    success("Copied", "Follow-up copied to clipboard.");
    setFollowUpCopied(true);
    setTimeout(() => setFollowUpCopied(false), 2000);
  }

  const daysSinceContact = brandCreator.lastContactedAt
    ? Math.floor((Date.now() - new Date(brandCreator.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const showFollowUp =
    status === "contacted" &&
    daysSinceContact !== null &&
    daysSinceContact >= followUpDaysThreshold;

  const { creator } = brandCreator;
  const statusOptions = getLeadStatusOptions();

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Main row */}
      <div className="flex items-center justify-between p-4 hover:bg-card/70 transition-colors">
        {/* Creator info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Avatar */}
          <Link href={`/creators/${creator.id}`}>
            <div className="w-10 h-10 rounded-full bg-card/70 border border-border flex items-center justify-center text-sm font-semibold shrink-0 hover:ring-2 ring-primary transition-all">
              {creator.avatarUrl ? (
                <img
                  src={creator.avatarUrl}
                  alt={creator.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                creator.name.charAt(0).toUpperCase()
              )}
            </div>
          </Link>

          {/* Name and details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/creators/${creator.id}`}
                className="font-medium hover:underline truncate"
              >
                {creator.name}
              </Link>
              {creator.country && (
                <span className="text-sm">{getFlagEmoji(creator.country)}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {creator.platforms.slice(0, 2).map((platform) => (
                <PlatformBadge
                  key={platform.id}
                  platformId={platform.platformId}
                  handle={platform.handle}
                  followerCount={platform.followerCount}
                />
              ))}
              {creator.platforms.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{creator.platforms.length - 2} more
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Source */}
        <div className="hidden md:block w-32 text-sm text-muted-foreground">
          {brandCreator.source || "—"}
        </div>

        {/* Last contacted */}
        <div className="hidden lg:block w-32 text-sm text-muted-foreground">
          {brandCreator.lastContactedAt
            ? formatDate(brandCreator.lastContactedAt)
            : "Never"}
        </div>

        {/* Generate DM button */}
        <Button
          size="sm"
          variant="outline"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="hidden md:flex mr-2 shrink-0"
        >
          {isGenerating ? "Generating…" : outreachMessage ? "Regenerate DM" : "Generate DM"}
        </Button>

        {/* Follow-up button — only for contacted creators past threshold */}
        {showFollowUp && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateFollowUp}
            disabled={isGeneratingFollowUp}
            className="hidden md:flex mr-2 shrink-0 border-border text-primary hover:bg-card"
            title={`${daysSinceContact}d since last contact`}
          >
            {isGeneratingFollowUp ? "Generating…" : `Follow-up (${daysSinceContact}d)`}
          </Button>
        )}

        {/* Status dropdown */}
        <div className="w-36 shrink-0">
          <Select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
            disabled={updating}
            className="text-sm h-9"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Follow-up panel */}
      {followUpOpen && (
        <div className="border-t border-border bg-card/70 p-4 space-y-3">
          <p className="text-xs font-medium text-primary">Follow-up message</p>
          {isGeneratingFollowUp ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="animate-spin">⟳</span>
              Writing follow-up for {creator.name}…
            </div>
          ) : followUpMessage !== null ? (
            <>
              <textarea
                className="w-full min-h-[100px] text-sm p-3 rounded-md border bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                value={followUpMessage}
                onChange={(e) => { setFollowUpMessage(e.target.value); setFollowUpSaved(false); }}
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleCopyFollowUp} variant="outline">
                  {followUpCopied ? "Copied!" : "Copy"}
                </Button>
                <Button size="sm" onClick={handleSaveFollowUp} disabled={isSavingFollowUp} variant="outline">
                  {isSavingFollowUp ? "Saving…" : followUpSaved ? "Saved ✓" : "Save Draft"}
                </Button>
                <button
                  onClick={() => setFollowUpOpen(false)}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Outreach panel — expands below the row */}
      {outreachOpen && (
        <div className="border-t border-border bg-card/70 p-4 space-y-3">
          {isGenerating ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="animate-spin">⟳</span>
              Writing personalized DM for {creator.name}…
            </div>
          ) : outreachMessage !== null ? (
            <>
              <textarea
                className="w-full min-h-[120px] text-sm p-3 rounded-md border bg-background resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                value={outreachMessage}
                onChange={(e) => { setOutreachMessage(e.target.value); setSaved(false); }}
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleCopy} variant="outline">
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving} variant="outline">
                  {isSaving ? "Saving…" : saved ? "Saved ✓" : "Save Draft"}
                </Button>
                <button
                  onClick={() => setOutreachOpen(false)}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function formatDate(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
