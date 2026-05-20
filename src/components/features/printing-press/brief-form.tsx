"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { generateBriefAction, saveBriefAction } from "@/lib/actions/briefs";
import { Loader2, Sparkles, Download, Copy, Check, FileText, Lock } from "lucide-react";

type Brand = {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  brandAnalysis: any;
};

type Creator = {
  id: string;
  name: string;
  email?: string | null;
  bio?: string | null;
  avatarUrl: string | null;
  country?: string | null;
  tier: string | null;
  platforms: {
    id?: string;
    platformId: string;
    handle: string;
    followerCount: number | null;
  }[];
};

type Props = {
  brandId: string;
  brand: Brand;
  brandCreatorId: string;
  creator: Creator;
};

export function BriefForm({ brandId, brand, brandCreatorId, creator }: Props) {
  const { success, error } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [briefGenerated, setBriefGenerated] = useState(false);
  const [generatedBrief, setGeneratedBrief] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [campaignName, setCampaignName] = useState(`${brand.name} x ${creator.name}`);
  const [cta, setCta] = useState(`Use code ${creator.name.toUpperCase().slice(0, 5)}15 for 15% off`);
  const [postingDeadline, setPostingDeadline] = useState("");
  const [contentTypes, setContentTypes] = useState<string[]>(["Instagram Reel"]);
  const [notes, setNotes] = useState("");
  const [talkingPoints, setTalkingPoints] = useState("");
  const [dos, setDos] = useState("");
  const [donts, setDonts] = useState("");
  const [hashtags, setHashtags] = useState(`#${brand.name.replace(/\s/g, "").toLowerCase()}`);

  const primaryPlatform = creator.platforms[0];

  const handleGenerateBrief = async () => {
    setIsGenerating(true);
    
    const result = await generateBriefAction({
      brandId,
      brandCreatorId,
      brandName: brand.name,
      brandAnalysis: brand.brandAnalysis,
      creatorName: creator.name,
      creatorBio: creator.bio ?? null,
      creatorPlatform: primaryPlatform?.platformId || "instagram",
      creatorHandle: primaryPlatform?.handle || "",
      campaignName,
      cta,
      contentTypes,
      notes,
      talkingPoints,
    });

    if (result.success) {
      setGeneratedBrief(result.brief);
      setBriefGenerated(true);
      success("Brief generated", "Creator brief is ready.");
    } else {
      error("Failed to generate brief", result.error || "Please try again.");
    }
    
    setIsGenerating(false);
  };

  const handleCopy = async () => {
    if (!generatedBrief) return;
    await navigator.clipboard.writeText(generatedBrief);
    success("Copied", "Brief copied to clipboard.");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const contentTypeOptions = ["Instagram Reel", "TikTok", "YouTube Short", "UGC", "Story"];

  return (
    <div className="space-y-6">
      {/* Creator Brief Section */}
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">1</span>
            <h3 className="font-semibold">Creator Brief — {creator.name}</h3>
          </div>
          {briefGenerated && (
            <Badge className="bg-green-500/20 text-green-500 border-green-500/30">COMPLETE</Badge>
          )}
        </div>

        {/* Creator info */}
        <div className="text-sm text-muted-foreground mb-4">
          <p><strong>{creator.name}</strong> • @{primaryPlatform?.handle}</p>
          <p>Niche: {primaryPlatform?.platformId} • Followers: {primaryPlatform?.followerCount?.toLocaleString()} • Location: US</p>
          {creator.bio && <p>Bio: {creator.bio}</p>}
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="campaignName">Campaign Name</Label>
            <Input 
              id="campaignName"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., Summer Launch with Creator"
            />
          </div>
          <div>
            <Label htmlFor="postingDeadline">Posting Deadline</Label>
            <Input 
              id="postingDeadline"
              type="date"
              value={postingDeadline}
              onChange={(e) => setPostingDeadline(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-4">
          <Label htmlFor="cta">CTA / Link</Label>
          <Input 
            id="cta"
            value={cta}
            onChange={(e) => setCta(e.target.value)}
            placeholder="e.g., Use code CREATOR15 for 15% off"
          />
        </div>

        <div className="mb-4">
          <Label>Content Type</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {contentTypeOptions.map((type) => (
              <button
                key={type}
                onClick={() => {
                  if (contentTypes.includes(type)) {
                    setContentTypes(contentTypes.filter(t => t !== type));
                  } else {
                    setContentTypes([...contentTypes, type]);
                  }
                }}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  contentTypes.includes(type)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <Label htmlFor="notes">Notes to Creator (optional)</Label>
          <Textarea 
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any specific instructions or context..."
            rows={2}
          />
        </div>

        <div className="mb-4">
          <Label htmlFor="talkingPoints">Talking Points (optional)</Label>
          <Textarea 
            id="talkingPoints"
            value={talkingPoints}
            onChange={(e) => setTalkingPoints(e.target.value)}
            placeholder="Key points the creator should mention, one per line"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="dos" className="text-green-500">Do's (optional)</Label>
            <Textarea 
              id="dos"
              value={dos}
              onChange={(e) => setDos(e.target.value)}
              placeholder="Things to include or emphasize, one per line"
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="donts">Don'ts (optional)</Label>
            <Textarea 
              id="donts"
              value={donts}
              onChange={(e) => setDonts(e.target.value)}
              placeholder="Things to avoid mentioning, one per line"
              rows={2}
            />
          </div>
        </div>

        <div className="mb-4">
          <Label htmlFor="hashtags">Hashtags (optional)</Label>
          <Input 
            id="hashtags"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="#brandname #summer2026"
          />
        </div>

        {/* Generate button */}
        {!briefGenerated ? (
          <Button 
            onClick={handleGenerateBrief}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing product and brand fit...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Brief
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Generated brief preview */}
            <div className="rounded-lg bg-muted/50 p-4">
              <pre className="text-sm whitespace-pre-wrap font-sans">{generatedBrief}</pre>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                .DOCX
              </Button>
              <Button variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                .PDF
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Content Licensing Agreement Section */}
      <div className="rounded-lg border p-4 opacity-60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm font-medium">2</span>
            <h3 className="font-semibold">Content Licensing Agreement</h3>
          </div>
          <Badge variant="outline" className="gap-1">
            <Lock className="h-3 w-3" />
            LOCKED
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Generate the creator brief first. The agreement section unlocks after the brief is complete.
        </p>
      </div>

      {/* Ship Product Section */}
      <div className="rounded-lg border p-4 opacity-60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm font-medium">3</span>
            <h3 className="font-semibold">Ship Product</h3>
          </div>
          <Badge variant="outline" className="gap-1">
            <Lock className="h-3 w-3" />
            LOCKED
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Generate the content licensing agreement first. A Shopify draft order will be created automatically.
        </p>
      </div>
    </div>
  );
}
