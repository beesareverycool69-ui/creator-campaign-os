"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { 
  generateOutreachAction, 
  markDMSentAction, 
  markCommentedAction,
  skipLeadAction,
  type OutreachLead 
} from "@/lib/actions/outreach";
import { Copy, Check, Sparkles, Send, MessageSquare, X, Loader2, ExternalLink } from "lucide-react";

type Props = {
  brandId: string;
  initialLeads: OutreachLead[];
  aiConfigured: boolean;
};

export function SendDMsQueue({ brandId, initialLeads, aiConfigured }: Props) {
  const { success, error } = useToast();
  const [leads, setLeads] = useState(initialLeads);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [comment, setComment] = useState("Check your DMs! Just sent a message. 💬");
  const [copied, setCopied] = useState<"dm" | "comment" | null>(null);
  const [dmSent, setDmSent] = useState(false);
  const [commented, setCommented] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);

  const currentLead = leads[currentIndex];

  if (!currentLead) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="font-medium">All done! No more leads in the queue.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Next: Track Replies so you can log accepts and move creators into campaigns.
        </p>
        <Link href={`/brands/${brandId}/track`}>
          <Button className="mt-4">Track Replies →</Button>
        </Link>
      </div>
    );
  }

  const primaryPlatform = currentLead.creator.platforms[0];
  const followerCount = primaryPlatform?.followerCount;
  const handle = primaryPlatform?.handle;
  const profileUrl = getProfileUrl(primaryPlatform);

  const handlePersonalize = async () => {
    if (!aiConfigured) return;
    setIsGenerating(true);
    try {
      const result = await generateOutreachAction(currentLead.id);
      if (result.success) {
        setGeneratedMessage(result.message);
        success("DM generated", "Personalized message ready.");
      } else {
        error("Failed to generate DM", result.error);
      }
    } catch (err) {
      error("Failed to generate DM", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (type: "dm" | "comment") => {
    const text = type === "dm" ? generatedMessage : comment;
    if (!text) return;
    
    await navigator.clipboard.writeText(text);
    success("Copied", type === "dm" ? "DM copied to clipboard." : "Comment copied to clipboard.");
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDMSent = () => {
    startTransition(async () => {
      try {
        await markDMSentAction(currentLead.id, generatedMessage || undefined);
        setDmSent(true);
        success("DM marked sent", "Next: Track Replies when the creator responds.");
      } catch (err) {
        error("Failed to mark DM sent", err instanceof Error ? err.message : "Please try again.");
      }
    });
  };

  const handleCommented = () => {
    startTransition(async () => {
      try {
        await markCommentedAction(currentLead.id, comment);
        setCommented(true);
        success("Comment marked", "Comment activity saved.");
      } catch (err) {
        error("Failed to mark comment", err instanceof Error ? err.message : "Please try again.");
      }
    });
  };

  const handleSubmit = () => {
    // Move to next lead
    setLeads(leads.filter((_, i) => i !== currentIndex));
    setGeneratedMessage(null);
    setDmSent(false);
    setCommented(false);
    setCopied(null);
    // Keep same index (next lead shifts into position)
  };

  const handleSkip = () => {
    startTransition(async () => {
      try {
        await skipLeadAction(currentLead.id);
        setLeads(leads.filter((_, i) => i !== currentIndex));
        setGeneratedMessage(null);
        setDmSent(false);
        setCommented(false);
        setCopied(null);
        success("Lead skipped", "This lead was removed from the queue.");
      } catch (err) {
        error("Failed to skip lead", err instanceof Error ? err.message : "Please try again.");
      }
    });
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Showing {leads.length} leads
      </p>

      <Card>
        <CardContent className="p-6">
          {/* Creator header */}
          <div className="mb-6 flex items-center gap-4">
            {currentLead.creator.avatarUrl ? (
              <img 
                src={currentLead.creator.avatarUrl} 
                alt={currentLead.creator.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-card/70 border border-border flex items-center justify-center text-2xl font-bold">
                {currentLead.creator.name[0]}
              </div>
            )}
            <div>
              <h3 className="text-xl font-semibold">{handle ? `@${handle}` : currentLead.creator.name}</h3>
              <p className="text-sm text-muted-foreground">{currentLead.creator.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {primaryPlatform && (
                  <Badge variant="secondary">{primaryPlatform.platformId}</Badge>
                )}
                {followerCount && (
                  <Badge variant="outline">{formatFollowers(followerCount)} followers</Badge>
                )}
                {currentLead.creator.tier && (
                  <Badge variant="outline">{currentLead.creator.tier}</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {currentLead.creator.bio && (
            <div className="mb-6 p-3 bg-card/70 border border-border rounded-lg">
              <p className="text-sm font-medium mb-1">Bio</p>
              <p className="text-sm text-muted-foreground">{currentLead.creator.bio}</p>
            </div>
          )}

          {/* Guided DM task */}
          <div className="mb-6 space-y-4 rounded-lg border border-border bg-card/50 p-4">
            <div>
              <p className="text-sm font-medium">Send this DM manually</p>
              <p className="text-xs text-muted-foreground">
                Open the profile, copy the DM, send it, then mark it sent.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {profileUrl ? (
                <a href={profileUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" type="button">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    1. Open Profile
                  </Button>
                </a>
              ) : (
                <Button variant="outline" size="sm" type="button" disabled>1. No profile linked</Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleCopy("dm")}
                disabled={!generatedMessage}
              >
                {copied === "dm" ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    2. Copy DM
                  </>
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handlePersonalize}
                disabled={isGenerating || !aiConfigured}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {aiConfigured ? "Personalize DM" : "AI Not Configured"}
                  </>
                )}
              </Button>
            </div>

            <Textarea
              value={generatedMessage || ""}
              onChange={(e) => setGeneratedMessage(e.target.value)}
              rows={5}
              className="resize-none bg-background"
              placeholder="Write or paste the DM here. AI personalization is optional."
            />
          </div>

          {/* Primary completion action */}
          <div className="space-y-3 border-t pt-4">
            <Button 
              onClick={handleDMSent}
              disabled={dmSent || isPending}
              variant={dmSent ? "secondary" : "default"}
              size="lg"
              className="w-full"
            >
              {dmSent ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  DM Sent
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Mark DM Sent
                </>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Only mark sent after you have sent the DM on the creator&apos;s profile.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button 
                onClick={handleSubmit}
                disabled={!dmSent || isPending}
                variant="outline"
                size="sm"
              >
                Next Lead →
              </Button>
              <Button 
                onClick={handleSkip}
                disabled={isPending}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4 mr-2" />
                Skip
              </Button>
            </div>
          </div>

          {/* Optional comment */}
          <div className="mt-6 rounded-lg border border-border/70 bg-background/40 p-4">
            <div className="mb-2">
              <p className="text-sm font-medium">Optional: comment on a post</p>
              <p className="text-xs text-muted-foreground">Use this only if commenting is part of your outreach process.</p>
            </div>
            <Textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="resize-none mb-2"
            />
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleCopy("comment")}
              >
                {copied === "comment" ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Comment
                  </>
                )}
              </Button>
              <Button 
                onClick={handleCommented}
                disabled={commented || isPending}
                variant={commented ? "secondary" : "ghost"}
                size="sm"
              >
                {commented ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Commented
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Mark Commented
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getProfileUrl(platform?: { platformId: string; handle: string | null } | null) {
  const handle = platform?.handle?.replace(/^@/, "");
  if (!platform || !handle) return null;

  switch (platform.platformId) {
    case "instagram":
      return `https://instagram.com/${handle}`;
    case "tiktok":
      return `https://tiktok.com/@${handle}`;
    case "youtube":
      return `https://youtube.com/@${handle}`;
    case "twitter":
    case "x":
    case "x_twitter":
      return `https://x.com/${handle}`;
    default:
      return null;
  }
}
