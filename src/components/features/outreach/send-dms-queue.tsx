"use client";

import { useState, useTransition } from "react";
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
};

export function SendDMsQueue({ brandId, initialLeads }: Props) {
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
        <p className="text-muted-foreground">
          All done! No more leads in the queue.
        </p>
      </div>
    );
  }

  const primaryPlatform = currentLead.creator.platforms[0];
  const followerCount = primaryPlatform?.followerCount;
  const handle = primaryPlatform?.handle;

  const handlePersonalize = async () => {
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
        success("DM marked sent", "Lead moved forward in outreach.");
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
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {currentLead.creator.avatarUrl ? (
                <img 
                  src={currentLead.creator.avatarUrl} 
                  alt={currentLead.creator.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold">
                  {currentLead.creator.name[0]}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold">{handle ? `@${handle}` : currentLead.creator.name}</h3>
                  <a 
                    href={`https://instagram.com/${handle}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
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
            <a 
              href={`https://instagram.com/${handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Profile →
            </a>
          </div>

          {/* Bio */}
          {currentLead.creator.bio && (
            <div className="mb-6 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-1">Bio</p>
              <p className="text-sm text-muted-foreground">{currentLead.creator.bio}</p>
            </div>
          )}

          {/* DM Message section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">1. DM Message</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePersonalize}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Personalize
                  </>
                )}
              </Button>
            </div>
            
            {generatedMessage ? (
              <div className="space-y-2">
                <Textarea 
                  value={generatedMessage}
                  onChange={(e) => setGeneratedMessage(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCopy("dm")}
                  >
                    {copied === "dm" ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Click "Personalize" to generate a custom message for this creator
              </p>
            )}
          </div>

          {/* Comment section */}
          <div className="mb-6">
            <p className="text-sm font-medium mb-2">2. Comment on Post</p>
            <Textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="resize-none mb-2"
            />
            <Button 
              variant="outline" 
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
                  Copy
                </>
              )}
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button 
              onClick={handleDMSent}
              disabled={dmSent || isPending}
              variant={dmSent ? "secondary" : "default"}
              className="flex-1"
            >
              {dmSent ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  DM Sent
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  DM Sent
                </>
              )}
            </Button>
            
            <Button 
              onClick={handleCommented}
              disabled={commented || isPending}
              variant={commented ? "secondary" : "outline"}
              className="flex-1"
            >
              {commented ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Commented
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Commented
                </>
              )}
            </Button>

            <Button 
              onClick={handleSubmit}
              disabled={!dmSent || isPending}
              variant="default"
              className="flex-1"
            >
              Submit →
            </Button>

            <Button 
              onClick={handleSkip}
              disabled={isPending}
              variant="ghost"
            >
              <X className="h-4 w-4 mr-2" />
              Skip
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
