import { Badge } from "@/components/ui/badge";

export type LeadStatus =
  | "discovered"
  | "researching"
  | "qualified"
  | "unqualified"
  | "contacted"
  | "engaged"
  | "active"
  | "paused"
  | "churned"
  | "blacklisted";

type LeadStatusBadgeProps = {
  status: LeadStatus;
  className?: string;
};

const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; className: string }
> = {
  discovered: {
    label: "Discovered",
    className: "bg-gray-100 text-gray-800 border-gray-200",
  },
  researching: {
    label: "Researching",
    className: "bg-secondary text-primary border-primary/30",
  },
  qualified: {
    label: "Qualified",
    className: "bg-secondary text-primary border-primary/30",
  },
  unqualified: {
    label: "Unqualified",
    className: "bg-slate-100 text-slate-800 border-slate-200",
  },
  contacted: {
    label: "Contacted",
    className: "bg-secondary text-primary border-accent/40",
  },
  engaged: {
    label: "Engaged",
    className: "bg-primary/10 text-primary border-primary/30",
  },
  active: {
    label: "Active",
    className: "bg-primary/10 text-primary border-primary/30",
  },
  paused: {
    label: "Paused",
    className: "bg-accent/30 text-primary border-accent/40",
  },
  churned: {
    label: "Churned",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  blacklisted: {
    label: "Blacklisted",
    className: "bg-red-900 text-white border-red-900",
  },
};

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant="outline" className={`${config.className} ${className || ""}`}>
      {config.label}
    </Badge>
  );
}

export function getLeadStatusOptions() {
  return Object.entries(STATUS_CONFIG).map(([value, config]) => ({
    value: value as LeadStatus,
    label: config.label,
  }));
}
