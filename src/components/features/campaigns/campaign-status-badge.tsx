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
    className: "bg-secondary text-primary border-primary/30",
  },
  recruiting: {
    label: "Recruiting",
    className: "bg-secondary text-primary border-primary/30",
  },
  active: {
    label: "Active",
    className: "bg-primary/10 text-primary border-primary/30",
  },
  completed: {
    label: "Completed",
    className: "bg-primary/10 text-primary border-primary/30",
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
