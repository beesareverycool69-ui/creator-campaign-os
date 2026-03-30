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
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  qualified: {
    label: "Qualified",
    className: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  unqualified: {
    label: "Unqualified",
    className: "bg-slate-100 text-slate-800 border-slate-200",
  },
  contacted: {
    label: "Contacted",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  engaged: {
    label: "Engaged",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  active: {
    label: "Active",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  paused: {
    label: "Paused",
    className: "bg-orange-100 text-orange-800 border-orange-200",
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
