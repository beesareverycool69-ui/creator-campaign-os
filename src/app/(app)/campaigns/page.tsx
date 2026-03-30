import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CampaignCard } from "@/components/features/campaigns";
import { getCampaigns } from "@/lib/actions/campaigns";

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Manage your creator campaigns
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button>+ New Campaign</Button>
        </Link>
      </div>

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first campaign to start working with creators.
          </p>
          <Link href="/campaigns/new">
            <Button>+ New Campaign</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}
