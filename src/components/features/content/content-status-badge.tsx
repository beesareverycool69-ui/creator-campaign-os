"use client";

import { Badge } from "@/components/ui/badge";

export type ContentStatus =
  | "pending"
  | "in_progress"
  | "submitted"
  | "in_review"
  | "revision_requested"
  | "approved"
  | "rejected"
  | "cancelled"
  | "scheduled"
  | "posting"
  | "posted"
  | "live"
  | "underperforming"
  | "completed"
  | "removed"
  | "failed";

type StatusConfig = {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  emoji: string;
};

const STATUS_CONFIG: Record<ContentStatus, StatusConfig> = {
  pending: {
    label: "Pending",
    variant: "secondary",
    emoji: "⏳",
  },
  in_progress: {
    label: "In Progress",
    variant: "secondary",
    emoji: "🎬",
  },
  submitted: {
    label: "Submitted",
    variant: "default",
    emoji: "📤",
  },
  in_review: {
    label: "In Review",
    variant: "default",
    emoji: "👀",
  },
  revision_requested: {
    label: "Revision Requested",
    variant: "destructive",
    emoji: "✏️",
  },
  approved: {
    label: "Approved",
    variant: "default",
    emoji: "✅",
  },
  rejected: {
    label: "Rejected",
    variant: "destructive",
    emoji: "❌",
  },
  cancelled: {
    label: "Cancelled",
    variant: "outline",
    emoji: "🚫",
  },
  scheduled: {
    label: "Scheduled",
    variant: "secondary",
    emoji: "📅",
  },
  posting: {
    label: "Posting",
    variant: "secondary",
    emoji: "🚀",
  },
  posted: {
    label: "Posted",
    variant: "default",
    emoji: "📱",
  },
  live: {
    label: "Live",
    variant: "default",
    emoji: "🟢",
  },
  underperforming: {
    label: "Underperforming",
    variant: "destructive",
    emoji: "📉",
  },
  completed: {
    label: "Completed",
    variant: "default",
    emoji: "🏁",
  },
  removed: {
    label: "Removed",
    variant: "destructive",
    emoji: "🗑️",
  },
  failed: {
    label: "Failed",
    variant: "destructive",
    emoji: "⚠️",
  },
};

type ContentStatusBadgeProps = {
  status: ContentStatus;
  showEmoji?: boolean;
};

export function ContentStatusBadge({
  status,
  showEmoji = true,
}: ContentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <Badge variant={config.variant}>
      {showEmoji && <span className="mr-1">{config.emoji}</span>}
      {config.label}
    </Badge>
  );
}

export function getContentStatusOptions() {
  return Object.entries(STATUS_CONFIG).map(([value, config]) => ({
    value,
    label: `${config.emoji} ${config.label}`,
  }));
}
