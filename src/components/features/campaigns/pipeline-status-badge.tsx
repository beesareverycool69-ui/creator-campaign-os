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
    className: "bg-blue-100 text-blue-800 border-blue-200",
    emoji: "✉️",
  },
  reminded: {
    label: "Reminded",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    emoji: "🔔",
  },
  negotiating: {
    label: "Negotiating",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
    emoji: "💬",
  },
  accepted: {
    label: "Accepted",
    className: "bg-indigo-100 text-indigo-800 border-indigo-200",
    emoji: "✅",
  },
  declined: {
    label: "Declined",
    className: "bg-slate-100 text-slate-700 border-slate-200",
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
    className: "bg-purple-100 text-purple-800 border-purple-200",
    emoji: "📝",
  },
  ready: {
    label: "Ready",
    className: "bg-cyan-100 text-cyan-800 border-cyan-200",
    emoji: "🚀",
  },
  // Execution
  shipped: {
    label: "Shipped",
    className: "bg-amber-100 text-amber-800 border-amber-200",
    emoji: "📦",
  },
  creating: {
    label: "Creating",
    className: "bg-green-100 text-green-800 border-green-200",
    emoji: "🎨",
  },
  in_review: {
    label: "In Review",
    className: "bg-orange-100 text-orange-800 border-orange-200",
    emoji: "👀",
  },
  revision: {
    label: "Revision",
    className: "bg-rose-100 text-rose-800 border-rose-200",
    emoji: "🔄",
  },
  approved: {
    label: "Approved",
    className: "bg-teal-100 text-teal-800 border-teal-200",
    emoji: "✨",
  },
  posting: {
    label: "Posting",
    className: "bg-violet-100 text-violet-800 border-violet-200",
    emoji: "📤",
  },
  posted: {
    label: "Posted",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
    emoji: "📱",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-200 text-emerald-900 border-emerald-300",
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
