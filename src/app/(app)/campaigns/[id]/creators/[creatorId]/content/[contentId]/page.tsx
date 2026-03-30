import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ContentStatusBadge,
  ContentReview,
  RevisionHistory,
  PostTracker,
} from "@/components/features/content";
import { getContentById } from "@/lib/actions/content";

type Props = {
  params: Promise<{ id: string; creatorId: string; contentId: string }>;
};

export default async function ContentDetailPage({ params }: Props) {
  const { id: campaignId, creatorId, contentId } = await params;

  const content = await getContentById(contentId);

  if (!content) {
    notFound();
  }

  const { campaignCreator, revisions, metrics } = content;
  const { campaign, brandCreator } = campaignCreator;
  const { creator } = brandCreator;

  // Get latest metrics if available
  const latestMetrics = metrics[0] || null;

  // Calculate total engagement
  const totalEngagement = latestMetrics
    ? (latestMetrics.likes || 0) +
      (latestMetrics.comments || 0) +
      (latestMetrics.shares || 0) +
      (latestMetrics.saves || 0)
    : 0;

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
        <Link
          href={`/campaigns/${campaignId}/creators/${creatorId}/content`}
          className="hover:text-foreground"
        >
          Content
        </Link>
        <span>/</span>
        <span>{content.title || content.type}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">
              {content.title ||
                `${content.type.charAt(0).toUpperCase() + content.type.slice(1)} Content`}
            </h1>
            <ContentStatusBadge status={content.status as any} />
          </div>
          <p className="text-muted-foreground">
            By {creator.name} • Submitted{" "}
            {new Date(content.createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Content Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Content Preview</CardTitle>
            </CardHeader>
            <CardContent>
              {content.fileUrls && content.fileUrls.length > 0 ? (
                <div className="space-y-4">
                  {content.fileUrls.map((url, index) => {
                    const isVideo = url.match(/\.(mp4|mov|webm|avi)$/i);
                    return (
                      <div key={index} className="rounded-lg overflow-hidden bg-muted">
                        {isVideo ? (
                          <video
                            src={url}
                            controls
                            className="w-full max-h-[500px] object-contain"
                          />
                        ) : (
                          <img
                            src={url}
                            alt={`Content ${index + 1}`}
                            className="w-full max-h-[500px] object-contain"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-muted rounded-lg">
                  <p className="text-muted-foreground">No content files</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Caption */}
          {content.caption && (
            <Card>
              <CardHeader>
                <CardTitle>Caption / Script</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{content.caption}</p>
              </CardContent>
            </Card>
          )}

          {/* Creator Notes */}
          {content.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Creator Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {content.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Revision History */}
          <RevisionHistory revisions={revisions} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="capitalize">{content.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform</span>
                <span className="capitalize">
                  {content.platformId || "Not specified"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Revisions</span>
                <span>{content.revisionCount || 0}</span>
              </div>
              {content.approvedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approved</span>
                  <span>
                    {new Date(content.approvedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review Actions */}
          <ContentReview
            contentId={content.id}
            currentStatus={content.status as any}
          />

          {/* Post Tracking */}
          {["approved", "posted", "live", "completed"].includes(content.status) && (
            <PostTracker
              contentId={content.id}
              currentStatus={content.status as any}
              postUrl={content.postUrl}
              postedAt={content.postedAt}
            />
          )}

          {/* Metrics */}
          {latestMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {latestMetrics.views !== null && (
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {latestMetrics.views.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Views</div>
                    </div>
                  )}
                  {latestMetrics.likes !== null && (
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {latestMetrics.likes.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Likes</div>
                    </div>
                  )}
                  {latestMetrics.comments !== null && (
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {latestMetrics.comments.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Comments</div>
                    </div>
                  )}
                  {latestMetrics.shares !== null && (
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {latestMetrics.shares.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Shares</div>
                    </div>
                  )}
                </div>
                {latestMetrics.engagementRate && (
                  <div className="mt-4 pt-4 border-t text-center">
                    <div className="text-xl font-bold text-green-600">
                      {latestMetrics.engagementRate}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Engagement Rate
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-4">
                  Last updated:{" "}
                  {new Date(latestMetrics.recordedAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
