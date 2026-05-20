"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { markAsPosted, markAsLive, addContentMetrics } from "@/lib/actions/content";
import { ContentStatus } from "./content-status-badge";

type PostTrackerProps = {
  contentId: string;
  currentStatus: ContentStatus;
  postUrl: string | null;
  postedAt: Date | null;
};

export function PostTracker({
  contentId,
  currentStatus,
  postUrl,
  postedAt,
}: PostTrackerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMetricsForm, setShowMetricsForm] = useState(false);

  const canMarkAsPosted = currentStatus === "approved";
  const canMarkAsLive = currentStatus === "posted";
  const canAddMetrics = ["posted", "live", "completed"].includes(currentStatus);

  async function handleMarkAsPosted(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const url = formData.get("postUrl") as string;
    const dateStr = formData.get("postedAt") as string;

    if (!url) {
      setError("Post URL is required");
      setLoading(false);
      return;
    }

    try {
      await markAsPosted(
        contentId,
        url,
        dateStr ? new Date(dateStr) : undefined
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsLive() {
    setLoading(true);
    setError(null);
    try {
      await markAsLive(contentId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMetrics(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      await addContentMetrics({
        contentId,
        views: parseInt(formData.get("views") as string) || undefined,
        likes: parseInt(formData.get("likes") as string) || undefined,
        comments: parseInt(formData.get("comments") as string) || undefined,
        shares: parseInt(formData.get("shares") as string) || undefined,
        saves: parseInt(formData.get("saves") as string) || undefined,
        clicks: parseInt(formData.get("clicks") as string) || undefined,
      });
      setShowMetricsForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add metrics");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Post Tracking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current post info */}
        {postUrl && (
          <div className="bg-card/70 border border-border p-3 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Post URL</span>
              <a
                href={postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                View Post →
              </a>
            </div>
            <p className="text-sm text-muted-foreground truncate">{postUrl}</p>
            {postedAt && (
              <p className="text-xs text-muted-foreground">
                Posted on{" "}
                {new Date(postedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        )}

        {/* Mark as Posted form */}
        {canMarkAsPosted && (
          <form onSubmit={handleMarkAsPosted} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="postUrl">Post URL *</Label>
              <Input
                id="postUrl"
                name="postUrl"
                type="url"
                placeholder="https://instagram.com/p/..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postedAt">Posted Date</Label>
              <Input
                id="postedAt"
                name="postedAt"
                type="datetime-local"
                defaultValue={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "📱 Mark as Posted"}
            </Button>
          </form>
        )}

        {/* Mark as Live button */}
        {canMarkAsLive && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Verify the content is still live and accessible.
            </p>
            <Button onClick={handleMarkAsLive} disabled={loading}>
              {loading ? "Updating..." : "🟢 Verify as Live"}
            </Button>
          </div>
        )}

        {/* Metrics form */}
        {canAddMetrics && (
          <>
            {!showMetricsForm ? (
              <Button
                variant="outline"
                onClick={() => setShowMetricsForm(true)}
              >
                📊 Add Metrics
              </Button>
            ) : (
              <form onSubmit={handleAddMetrics} className="space-y-4 p-4 bg-card/70 border border-border rounded-lg">
                <h4 className="font-medium">Add Performance Metrics</h4>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="views" className="text-xs">Views</Label>
                    <Input
                      id="views"
                      name="views"
                      type="number"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="likes" className="text-xs">Likes</Label>
                    <Input
                      id="likes"
                      name="likes"
                      type="number"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="comments" className="text-xs">Comments</Label>
                    <Input
                      id="comments"
                      name="comments"
                      type="number"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="shares" className="text-xs">Shares</Label>
                    <Input
                      id="shares"
                      name="shares"
                      type="number"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="saves" className="text-xs">Saves</Label>
                    <Input
                      id="saves"
                      name="saves"
                      type="number"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="clicks" className="text-xs">Clicks</Label>
                    <Input
                      id="clicks"
                      name="clicks"
                      type="number"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Save Metrics"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowMetricsForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
