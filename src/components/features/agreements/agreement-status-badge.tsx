import { Badge } from "@/components/ui/badge";

export type AgreementStatus =
  | "draft"
  | "sent"
  | "signed"
  | "countersigned"
  | "active";

type AgreementStatusBadgeProps = {
  status: AgreementStatus;
  className?: string;
};

const STATUS_CONFIG: Record<
  AgreementStatus,
  { label: string; className: string; emoji: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-gray-100 text-gray-800 border-gray-200",
    emoji: "📝",
  },
  sent: {
    label: "Sent",
    className: "bg-secondary text-primary border-primary/30",
    emoji: "✉️",
  },
  signed: {
    label: "Signed",
    className: "bg-secondary text-primary border-border",
    emoji: "✍️",
  },
  countersigned: {
    label: "Countersigned",
    className: "bg-primary/10 text-primary border-primary/30",
    emoji: "✅",
  },
  active: {
    label: "Active",
    className: "bg-primary/10 text-primary border-primary/30",
    emoji: "🟢",
  },
};

export function AgreementStatusBadge({
  status,
  className,
}: AgreementStatusBadgeProps) {
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

export function getAgreementStatusOptions() {
  return Object.entries(STATUS_CONFIG).map(([value, config]) => ({
    value: value as AgreementStatus,
    label: config.label,
    emoji: config.emoji,
  }));
}
