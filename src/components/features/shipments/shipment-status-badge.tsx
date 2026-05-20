import { Badge } from "@/components/ui/badge";

export type ShipmentStatus =
  | "pending"
  | "shipped"
  | "in_transit"
  | "delivered"
  | "exception";

type ShipmentStatusBadgeProps = {
  status: ShipmentStatus;
  className?: string;
};

const STATUS_CONFIG: Record<
  ShipmentStatus,
  { label: string; className: string; emoji: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-gray-100 text-gray-800 border-gray-200",
    emoji: "📦",
  },
  shipped: {
    label: "Shipped",
    className: "bg-secondary text-primary border-primary/30",
    emoji: "🚚",
  },
  in_transit: {
    label: "In Transit",
    className: "bg-secondary text-primary border-border",
    emoji: "🛫",
  },
  delivered: {
    label: "Delivered",
    className: "bg-primary/10 text-primary border-primary/30",
    emoji: "✅",
  },
  exception: {
    label: "Exception",
    className: "bg-red-100 text-red-800 border-red-200",
    emoji: "⚠️",
  },
};

export function ShipmentStatusBadge({
  status,
  className,
}: ShipmentStatusBadgeProps) {
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

export function getShipmentStatusOptions() {
  return Object.entries(STATUS_CONFIG).map(([value, config]) => ({
    value: value as ShipmentStatus,
    label: config.label,
    emoji: config.emoji,
  }));
}
