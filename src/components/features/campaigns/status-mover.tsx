"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  PipelineStatus,
  getPipelineStatusOptions,
  MAIN_PIPELINE_STAGES,
} from "./pipeline-status-badge";
import { updateCampaignCreatorStatus } from "@/lib/actions/campaign-creators";

type StatusMoverProps = {
  campaignCreatorId: string;
  currentStatus: PipelineStatus;
  variant?: "dropdown" | "buttons" | "both";
};

export function StatusMover({
  campaignCreatorId,
  currentStatus,
  variant = "both",
}: StatusMoverProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusOptions = getPipelineStatusOptions();

  // Get previous and next status for quick navigation
  const currentIndex = MAIN_PIPELINE_STAGES.indexOf(currentStatus);
  const prevStatus =
    currentIndex > 0 ? MAIN_PIPELINE_STAGES[currentIndex - 1] : null;
  const nextStatus =
    currentIndex < MAIN_PIPELINE_STAGES.length - 1 && currentStatus !== "dropped"
      ? MAIN_PIPELINE_STAGES[currentIndex + 1]
      : null;

  async function handleStatusChange(newStatus: PipelineStatus) {
    if (newStatus === currentStatus) return;

    setLoading(true);
    setError(null);

    try {
      await updateCampaignCreatorStatus(campaignCreatorId, newStatus);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Quick navigation buttons */}
      {(variant === "buttons" || variant === "both") && (
        <div className="flex items-center gap-2">
          {prevStatus && (
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => handleStatusChange(prevStatus)}
            >
              ← {statusOptions.find((s) => s.value === prevStatus)?.label}
            </Button>
          )}

          {nextStatus && (
            <Button
              variant="default"
              size="sm"
              disabled={loading}
              onClick={() => handleStatusChange(nextStatus)}
            >
              {statusOptions.find((s) => s.value === nextStatus)?.label} →
            </Button>
          )}

          {currentStatus !== "dropped" && (
            <Button
              variant="ghost"
              size="sm"
              disabled={loading}
              onClick={() => handleStatusChange("dropped")}
              className="text-destructive hover:text-destructive"
            >
              Drop
            </Button>
          )}
        </div>
      )}

      {/* Full dropdown */}
      {(variant === "dropdown" || variant === "both") && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Move to:</span>
          <Select
            value={currentStatus}
            onChange={(e) =>
              handleStatusChange(e.target.value as PipelineStatus)
            }
            disabled={loading}
            className="w-40"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.emoji} {option.label}
              </option>
            ))}
          </Select>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
