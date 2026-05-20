import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ContentCard, ContentStatusBadge } from "@/components/features/content";
import { getCampaignCreatorById } from "@/lib/actions/campaign-creators";
import { getContent, getContentStats } from "@/lib/actions/content";

type Props = {
  params: Promise<{ id: string; creatorId: string }>;
};

export default async function ContentListPage({ params }: Props) {
  const { id: campaignId, creatorId } = await params;

  const [campaignCreator, contentList, stats] = await Promise.all([
    getCampaignCreatorById(creatorId),
    getContent(creatorId),
    getContentStats(creatorId),
  ]);

  if (!campaignCreator) {
    notFound();
  }

  const { campaign, brandCreator } = campaignCreator;
  const { creator } = brandCreator;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/campaigns" className="hover:text-foreground">
          Campaigns
        </Link>
        <span>/</span>
        <Link href={`/campaigns/${campaignId}`} className="hover:text-foreground">
          {campaign.name}
        </Link>
        <span>/</span>
        <Link
          href={`/campaigns/${campaignId}/creators/${creatorId}`}
          className="hover:text-foreground"
        >
          {creator.name}
        </Link>
        <span>/</span>
        <span>Content</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content</h1>
          <p className="text-muted-foreground">
            {creator.name}'s content submissions for {campaign.name}
          </p>
        </div>

        <Link href={`/campaigns/${campaignId}/creators/${creatorId}/content/new`}>
          <Button>+ Internal Upload</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card/70 border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Total</div>
        </div>
        <div className="bg-card/70 border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">{stats.submitted}</div>
          <div className="text-sm text-muted-foreground">In Review</div>
        </div>
        <div className="bg-card/70 border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">{stats.revisionRequested}</div>
          <div className="text-sm text-muted-foreground">Revisions</div>
        </div>
        <div className="bg-card/70 border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">{stats.approved}</div>
          <div className="text-sm text-muted-foreground">Approved</div>
        </div>
        <div className="bg-card/70 border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">{stats.posted}</div>
          <div className="text-sm text-muted-foreground">Posted</div>
        </div>
      </div>

      {/* Content Grid */}
      {contentList.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-4xl mb-4">📹</p>
          <h3 className="text-lg font-medium mb-2">No content yet</h3>
          <p className="text-muted-foreground mb-4">
            Send the creator their portal link for uploads, or add content manually with internal upload.
          </p>
          <Link href={`/campaigns/${campaignId}/creators/${creatorId}/content/new`}>
            <Button>Internal Upload</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {contentList.map((content) => (
            <ContentCard
              key={content.id}
              id={content.id}
              campaignId={campaignId}
              campaignCreatorId={creatorId}
              type={content.type}
              title={content.title}
              thumbnailUrl={content.thumbnailUrl}
              fileUrls={content.fileUrls}
              status={content.status}
              revisionCount={content.revisionCount}
              postedAt={content.postedAt}
              createdAt={content.createdAt}
              platformId={content.platformId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
