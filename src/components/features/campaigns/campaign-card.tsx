import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CampaignStatusBadge } from "./campaign-status-badge";

type CampaignCardProps = {
  campaign: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    startDate: string | null;
    endDate: string | null;
    creatorCount: number;
    brand: {
      id: string;
      name: string;
      logoUrl: string | null;
    } | null;
  };
};

export function CampaignCard({ campaign }: CampaignCardProps) {
  return (
    <Link href={`/campaigns/${campaign.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Brand logo */}
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
              {campaign.brand?.logoUrl ? (
                <img
                  src={campaign.brand.logoUrl}
                  alt={campaign.brand.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                campaign.brand?.name.charAt(0).toUpperCase() || "?"
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{campaign.name}</h3>
                <CampaignStatusBadge status={campaign.status as any} />
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {campaign.brand?.name}
              </p>
              {campaign.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                  {campaign.description}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold">{campaign.creatorCount}</div>
              <div className="text-xs text-muted-foreground">creators</div>
              {campaign.startDate && (
                <div className="text-xs text-muted-foreground mt-1">
                  {formatDate(campaign.startDate)}
                  {campaign.endDate && ` - ${formatDate(campaign.endDate)}`}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
