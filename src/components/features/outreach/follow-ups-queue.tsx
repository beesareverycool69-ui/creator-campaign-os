"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { 
  generateFollowUpAction,
  markFollowUpSentAction,
  type FollowUpLead 
} from "@/lib/actions/outreach";
import { Copy, Check, Sparkles, Send, Loader2, ExternalLink, Clock } from "lucide-react";

type Props = {
  brandId: string;
  initialLeads: FollowUpLead[];
  followUpType: "fu1" | "fu2" | "reengage";
};

export function FollowUpsQueue({ brandId, initialLeads, followUpType }: Props) {
  const [leads, setLeads] = useState(initialLeads);
  
  if (leads.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">
          No follow-ups ready in this queue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {leads.map((lead) => (
        <FollowUpCard 
          key={lead.id} 
          lead={lead} 
          followUpType={followUpType}
          onComplete={() => setLeads(leads.filter(l => l.id !== lead.id))}
        />
      ))}
    </div>
  );
}

function FollowUpCard({ 
  lead, 
  followUpType,
  onComplete 
}: { 
  lead: FollowUpLead; 
  followUpType: "fu1" | "fu2" | "reengage";
  onComplete: () => void;
}) {
  const { success, error } = useToast();
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);

  const primaryPlatform = lead.creator.platforms[0];
  const handle = primaryPlatform?.handle;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateFollowUpAction(lead.id);
      if (result.success) {
        setGeneratedMessage(result.message);
        success("Follow-up generated", "Message ready to send.");
      } else {
        error("Failed to generate follow-up", result.error);
      }
    } catch (err) {
      error("Failed to generate follow-up", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedMessage) return;
    await navigator.clipboard.writeText(generatedMessage);
    success("Copied", "Follow-up copied to clipboard.");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEarly = () => {
    startTransition(async () => {
      try {
        await markFollowUpSentAction(lead.id, generatedMessage || undefined);
        success("Follow-up marked sent", "Lead follow-up saved.");
        onComplete();
      } catch (err) {
        error("Failed to mark follow-up sent", err instanceof Error ? err.message : "Please try again.");
      }
    });
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  const getBadgeColor = () => {
    if (lead.daysSinceContact <= 3) return "bg-orange-500/20 text-orange-500 border-orange-500/30";
    if (lead.daysSinceContact <= 7) return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
    return "bg-red-500/20 text-red-500 border-red-500/30";
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {lead.creator.avatarUrl ? (
              <img 
                src={lead.creator.avatarUrl} 
                alt={lead.creator.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold">
                {lead.creator.name[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{handle ? `@${handle}` : lead.creator.name}</h3>
                <Badge className={getBadgeColor()}>
                  <Clock className="h-3 w-3 mr-1" />
                  {lead.daysSinceContact} BIZ DAYS LEFT
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {followUpType === "fu1" ? "DM sent" : "FU1 sent"} • Target: {lead.lastContactedAt?.toLocaleDateString()}
              </p>
            </div>
          </div>

          <Button 
            onClick={handleSendEarly}
            disabled={isPending}
            variant="outline"
            className="bg-orange-500/10 border-orange-500/30 text-orange-500 hover:bg-orange-500/20"
          >
            Send Early
          </Button>
        </div>

        {/* Expandable message section */}
        {generatedMessage ? (
          <div className="mt-4 pt-4 border-t">
            <Textarea 
              value={generatedMessage}
              onChange={(e) => setGeneratedMessage(e.target.value)}
              rows={3}
              className="resize-none mb-2"
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCopy}
              >
                {copied ? (
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
              <Button 
                size="sm"
                onClick={handleSendEarly}
                disabled={isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                Mark Sent
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 pt-4 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGenerate}
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
                  Generate Follow-up Message
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
