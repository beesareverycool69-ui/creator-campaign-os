import { PipelineColumn } from "./pipeline-column";
import { MAIN_PIPELINE_STAGES, PipelineStatus } from "./pipeline-status-badge";

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

type PipelineBoardProps = {
  campaignId: string;
  creators: CampaignCreator[];
};

export function PipelineBoard({ campaignId, creators }: PipelineBoardProps) {
  // Count dropped separately
  const droppedCount = creators.filter((c) => c.status === "dropped").length;

  return (
    <div className="space-y-4">
      {/* Pipeline columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {MAIN_PIPELINE_STAGES.map((status) => (
          <PipelineColumn
            key={status}
            campaignId={campaignId}
            status={status}
            creators={creators}
          />
        ))}
      </div>

      {/* Dropped section (collapsed by default if there are dropped creators) */}
      {droppedCount > 0 && (
        <div className="border-t pt-4">
          <details className="group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
              <span>❌ Dropped ({droppedCount})</span>
              <span className="text-xs">(click to expand)</span>
            </summary>
            <div className="mt-4">
              <PipelineColumn
                campaignId={campaignId}
                status="dropped"
                creators={creators}
              />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
