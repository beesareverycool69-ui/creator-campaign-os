import { Badge } from "@/components/ui/badge";

export type PipelineStatus =
  // Recruitment
  | "shortlisted"
  | "invited"
  | "reminded"
  | "negotiating"
  | "accepted"
  | "declined"
  | "ghosted"
  // Onboarding
  | "onboarding"
  | "ready"
  // Execution
  | "shipped"
  | "creating"
  | "in_review"
  | "revision"
  | "approved"
  | "posting"
  | "posted"
  | "completed"
  // Terminal
  | "dropped"
  | "withdrawn";

type PipelineStatusBadgeProps = {
  status: PipelineStatus;
  className?: string;
};

const STATUS_CONFIG: Record<
  PipelineStatus,
  { label: string; className: string; emoji: string }
> = {
  // Recruitment
  shortlisted: {
    label: "Shortlisted",
    className: "bg-gray-100 text-gray-800 border-gray-200",
    emoji: "📋",
  },
  invited: {
    label: "Invited",
    className: "bg-secondary text-primary border-primary/30",
    emoji: "✉️",
  },
  reminded: {
    label: "Reminded",
    className: "bg-secondary/60 text-primary border-primary/30",
    emoji: "🔔",
  },
  negotiating: {
    label: "Negotiating",
    className: "bg-secondary text-primary border-accent/40",
    emoji: "💬",
  },
  accepted: {
    label: "Accepted",
    className: "bg-secondary text-primary border-primary/30",
    emoji: "✅",
  },
  declined: {
    label: "Declined",
    className: "bg-muted text-muted-foreground border-slate-200",
    emoji: "👎",
  },
  ghosted: {
    label: "Ghosted",
    className: "bg-slate-200 text-slate-600 border-slate-300",
    emoji: "👻",
  },
  // Onboarding
  onboarding: {
    label: "Onboarding",
    className: "bg-secondary text-primary border-primary/30",
    emoji: "📝",
  },
  ready: {
    label: "Ready",
    className: "bg-secondary text-primary border-primary/30",
    emoji: "🚀",
  },
  // Execution
  shipped: {
    label: "Shipped",
    className: "bg-secondary text-primary border-accent/40",
    emoji: "📦",
  },
  creating: {
    label: "Creating",
    className: "bg-primary/10 text-primary border-primary/30",
    emoji: "🎨",
  },
  in_review: {
    label: "In Review",
    className: "bg-accent/30 text-primary border-accent/40",
    emoji: "👀",
  },
  revision: {
    label: "Revision",
    className: "bg-secondary text-primary border-primary/30",
    emoji: "🔄",
  },
  approved: {
    label: "Approved",
    className: "bg-primary/10 text-primary border-primary/30",
    emoji: "✨",
  },
  posting: {
    label: "Posting",
    className: "bg-secondary text-primary border-primary/30",
    emoji: "📤",
  },
  posted: {
    label: "Posted",
    className: "bg-primary/10 text-primary border-primary/30",
    emoji: "📱",
  },
  completed: {
    label: "Completed",
    className: "bg-primary/20 text-primary border-primary/40",
    emoji: "🎉",
  },
  // Terminal
  dropped: {
    label: "Dropped",
    className: "bg-red-100 text-red-800 border-red-200",
    emoji: "❌",
  },
  withdrawn: {
    label: "Withdrawn",
    className: "bg-red-50 text-red-700 border-red-200",
    emoji: "🚪",
  },
};

// Pipeline order for display
export const PIPELINE_ORDER: PipelineStatus[] = [
  // Recruitment
  "shortlisted",
  "invited",
  "reminded",
  "negotiating",
  "accepted",
  "declined",
  "ghosted",
  // Onboarding
  "onboarding",
  "ready",
  // Execution
  "shipped",
  "creating",
  "in_review",
  "revision",
  "approved",
  "posting",
  "posted",
  "completed",
  // Terminal
  "dropped",
  "withdrawn",
];

// Main pipeline stages (the happy path, excluding terminal states)
export const MAIN_PIPELINE_STAGES: PipelineStatus[] = [
  "shortlisted",
  "invited",
  "negotiating",
  "accepted",
  "onboarding",
  "ready",
  "shipped",
  "creating",
  "in_review",
  "approved",
  "posting",
  "posted",
  "completed",
];

export function PipelineStatusBadge({
  status,
  className,
}: PipelineStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${className || ""}`}
    >
      {config.emoji} {config.label}
    </Badge>
  );
}

export function getPipelineStatusOptions() {
  return PIPELINE_ORDER.map((status) => ({
    value: status,
    label: STATUS_CONFIG[status].label,
    emoji: STATUS_CONFIG[status].emoji,
  }));
}

export function getStatusConfig(status: PipelineStatus) {
  return STATUS_CONFIG[status];
}
