"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  updateContentStatus,
  requestRevision,
  approveContent,
  rejectContent,
} from "@/lib/actions/content";
import { ContentStatus } from "./content-status-badge";

type ContentReviewProps = {
  contentId: string;
  currentStatus: ContentStatus;
};

export function ContentReview({ contentId, currentStatus }: ContentReviewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [actionType, setActionType] = useState<"revision" | "reject" | null>(null);

  // Determine which actions are available based on current status
  const canReview = ["submitted", "in_review"].includes(currentStatus);
  const canApprove = ["submitted", "in_review", "revision_requested"].includes(currentStatus);
  const canReject = ["submitted", "in_review", "revision_requested"].includes(currentStatus);
  const canRequestRevision = ["submitted", "in_review"].includes(currentStatus);

  async function handleMarkInReview() {
    setLoading(true);
    setError(null);
    try {
      await updateContentStatus(contentId, "in_review");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    setLoading(true);
    setError(null);
    try {
      await approveContent(contentId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestRevision() {
    if (!feedback.trim()) {
      setError("Please provide feedback for the revision request");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await requestRevision(contentId, feedback);
      setFeedback("");
      setShowFeedback(false);
      setActionType(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request revision");
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    setLoading(true);
    setError(null);
    try {
      await rejectContent(contentId, feedback || undefined);
      setFeedback("");
      setShowFeedback(false);
      setActionType(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setLoading(false);
    }
  }

  function openFeedbackForm(type: "revision" | "reject") {
    setActionType(type);
    setShowFeedback(true);
    setFeedback("");
    setError(null);
  }

  function cancelFeedback() {
    setShowFeedback(false);
    setActionType(null);
    setFeedback("");
    setError(null);
  }

  // If content is already approved, posted, etc., show minimal UI
  if (!canReview && !canApprove && !canRequestRevision) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Review Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No review actions available for this content status.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Feedback form */}
        {showFeedback && (
          <div className="space-y-3 p-4 bg-card/70 border border-border rounded-lg">
            <Label>
              {actionType === "revision" ? "Revision Feedback" : "Rejection Reason"}
            </Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              placeholder={
                actionType === "revision"
                  ? "Describe what changes are needed..."
                  : "Reason for rejection (optional)..."
              }
            />
            <div className="flex gap-2">
              {actionType === "revision" && (
                <Button
                  onClick={handleRequestRevision}
                  disabled={loading || !feedback.trim()}
                  variant="default"
                >
                  {loading ? "Sending..." : "Send Revision Request"}
                </Button>
              )}
              {actionType === "reject" && (
                <Button
                  onClick={handleReject}
                  disabled={loading}
                  variant="destructive"
                >
                  {loading ? "Rejecting..." : "Confirm Rejection"}
                </Button>
              )}
              <Button variant="outline" onClick={cancelFeedback}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!showFeedback && (
          <div className="flex flex-wrap gap-3">
            {currentStatus === "submitted" && (
              <Button
                variant="secondary"
                onClick={handleMarkInReview}
                disabled={loading}
              >
                👀 Mark as In Review
              </Button>
            )}

            {canApprove && (
              <Button
                variant="default"
                onClick={handleApprove}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                ✅ Approve
              </Button>
            )}

            {canRequestRevision && (
              <Button
                variant="secondary"
                onClick={() => openFeedbackForm("revision")}
                disabled={loading}
              >
                ✏️ Request Revision
              </Button>
            )}

            {canReject && (
              <Button
                variant="destructive"
                onClick={() => openFeedbackForm("reject")}
                disabled={loading}
              >
                ❌ Reject
              </Button>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Help text */}
        <p className="text-xs text-muted-foreground">
          {currentStatus === "submitted" && (
            <>Mark as "In Review" to indicate you're looking at it, then approve or request changes.</>
          )}
          {currentStatus === "in_review" && (
            <>Review the content and either approve, request revisions, or reject.</>
          )}
          {currentStatus === "revision_requested" && (
            <>Waiting for creator to submit updated content. You can still approve or reject.</>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
