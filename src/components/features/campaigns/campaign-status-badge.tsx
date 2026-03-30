import { Badge } from "@/components/ui/badge";

export type CampaignStatus =
  | "draft"
  | "approved"
  | "recruiting"
  | "active"
  | "completed"
  | "archived";

type CampaignStatusBadgeProps = {
  status: CampaignStatus;
  className?: string;
};

const STATUS_CONFIG: Record<
  CampaignStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-gray-100 text-gray-800 border-gray-200",
  },
  approved: {
    label: "Approved",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  recruiting: {
    label: "Recruiting",
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  active: {
    label: "Active",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  archived: {
    label: "Archived",
    className: "bg-gray-100 text-gray-500 border-gray-200",
  },
};

export function CampaignStatusBadge({
  status,
  className,
}: CampaignStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${className || ""}`}
    >
      {config.label}
    </Badge>
  );
}

export function getCampaignStatusOptions() {
  return Object.entries(STATUS_CONFIG).map(([value, config]) => ({
    value: value as CampaignStatus,
    label: config.label,
  }));
}
