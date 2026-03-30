import { PipelineCreatorCard } from "./pipeline-creator-card";
import {
  PipelineStatus,
  getStatusConfig,
} from "./pipeline-status-badge";

type CampaignCreator = {
  id: string;
  status: string;
  createdAt: Date;
  shortlistedAt: Date | null;
  invitedAt: Date | null;
  acceptedAt: Date | null;
  readyAt: Date | null;
  completedAt: Date | null;
  creator: {
    id: string;
    name: string;
    avatarUrl: string | null;
    country: string | null;
  };
  platforms: {
    id: string;
    platformId: string;
    handle: string;
    followerCount: number | null;
  }[];
};

type PipelineColumnProps = {
  campaignId: string;
  status: PipelineStatus;
  creators: CampaignCreator[];
};

function getStatusTimestamp(
  creator: CampaignCreator,
  status: PipelineStatus
): Date | null {
  switch (status) {
    case "shortlisted":
      return creator.shortlistedAt;
    case "invited":
      return creator.invitedAt;
    case "accepted":
      return creator.acceptedAt;
    case "ready":
      return creator.readyAt;
    case "completed":
      return creator.completedAt;
    default:
      return null;
  }
}

export function PipelineColumn({
  campaignId,
  status,
  creators,
}: PipelineColumnProps) {
  const config = getStatusConfig(status);
  const creatorsInStatus = creators.filter((c) => c.status === status);

  return (
    <div className="flex flex-col min-w-[280px] max-w-[280px]">
      {/* Column header */}
      <div className={`rounded-t-lg px-3 py-2 ${config.className}`}>
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">
            {config.emoji} {config.label}
          </span>
          <span className="text-sm font-semibold">{creatorsInStatus.length}</span>
        </div>
      </div>

      {/* Column content */}
      <div className="flex-1 bg-muted/30 rounded-b-lg p-2 space-y-2 min-h-[200px]">
        {creatorsInStatus.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            No creators
          </div>
        ) : (
          creatorsInStatus.map((creator) => (
            <PipelineCreatorCard
              key={creator.id}
              campaignId={campaignId}
              campaignCreator={creator}
              statusChangedAt={getStatusTimestamp(creator, status)}
            />
          ))
        )}
      </div>
    </div>
  );
}
