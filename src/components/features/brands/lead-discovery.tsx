"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Search,
  Upload,
  Image,
  Sparkles,
  Loader2,
  Plus,
  Check,
  X,
  Globe,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";

interface DiscoveredCreator {
  id?: string;
  handle: string;
  platform: "instagram" | "tiktok" | "youtube" | "twitter";
  name?: string;
  followers?: string;
  niche?: string;
  location?: string;
  profileUrl?: string;
  confidence?: number;
  selected?: boolean;
}

interface LeadDiscoveryProps {
  brandId: string;
  onAddCreators?: (creators: DiscoveredCreator[]) => void;
}

type TabType = "external" | "csv" | "ocr";

export function LeadDiscovery({ brandId, onAddCreators }: LeadDiscoveryProps) {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("external");
  const [isLoading, setIsLoading] = useState(false);
  const [discoveredCreators, setDiscoveredCreators] = useState<DiscoveredCreator[]>([]);

  // External Discovery state
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [platform, setPlatform] = useState<"all" | "instagram" | "tiktok" | "youtube">("all");
  const [followerRange, setFollowerRange] = useState<"any" | "nano" | "micro" | "mid" | "macro">("any");

  // CSV state
  const [csvText, setCsvText] = useState("");

  // OCR state
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);

  const followerRanges = {
    any: { min: undefined, max: undefined },
    nano: { min: 1000, max: 10000 },
    micro: { min: 10000, max: 50000 },
    mid: { min: 50000, max: 500000 },
    macro: { min: 500000, max: undefined },
  };

  const handleExternalDiscover = async () => {
    if (!keywords.trim()) return;
    setIsLoading(true);

    try {
      const range = followerRanges[followerRange];
      const response = await fetch("/api/discover-external", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords,
          platform,
          location: location || undefined,
          minFollowers: range.min,
          maxFollowers: range.max,
          limit: 15,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDiscoveredCreators(
          data.creators.map((c: DiscoveredCreator) => ({ ...c, selected: true }))
        );
        success("Discovery complete", `Found ${data.creators.length} creator${data.creators.length !== 1 ? "s" : ""}.`);
      } else {
        const result = await response.json();
        console.error("Discovery failed:", result);
        error("Discovery failed", result.error || "Please try again.");
      }
    } catch (err) {
      console.error("Discovery failed:", err);
      error("Discovery failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCSVParse = () => {
    if (!csvText.trim()) return;
    setIsLoading(true);

    try {
      const lines = csvText.trim().split("\n");
      const creators: DiscoveredCreator[] = [];

      for (const line of lines) {
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length === 0 || !parts[0]) continue;

        const handle = parts[0].replace("@", "");
        let detectedPlatform: DiscoveredCreator["platform"] = "instagram";

        if (handle.includes("tiktok.com") || parts[1]?.toLowerCase() === "tiktok") {
          detectedPlatform = "tiktok";
        } else if (handle.includes("youtube.com") || parts[1]?.toLowerCase() === "youtube") {
          detectedPlatform = "youtube";
        } else if (handle.includes("twitter.com") || handle.includes("x.com") || parts[1]?.toLowerCase() === "twitter") {
          detectedPlatform = "twitter";
        }

        creators.push({
          handle: handle.replace(/https?:\/\/[^/]+\/@?/, ""),
          platform: detectedPlatform,
          name: parts[2] || undefined,
          followers: parts[3] || undefined,
          location: parts[4] || undefined,
          selected: true,
        });
      }

      setDiscoveredCreators(creators);
      success("CSV parsed", `Found ${creators.length} creator${creators.length !== 1 ? "s" : ""}.`);
    } catch (err) {
      console.error("CSV parse failed:", err);
      error("CSV parse failed", err instanceof Error ? err.message : "Please check the format and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOCRUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setOcrPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleOCRProcess = async () => {
    if (!ocrFile) return;
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("image", ocrFile);
      formData.append("brandId", brandId);

      const response = await fetch("/api/ocr-creators", { method: "POST", body: formData });

      if (response.ok) {
        const data = await response.json();
        setDiscoveredCreators(
          data.creators.map((c: DiscoveredCreator) => ({ ...c, selected: true }))
        );
        success("OCR complete", `Found ${data.creators.length} creator${data.creators.length !== 1 ? "s" : ""}.`);
      } else {
        const result = await response.json();
        error("OCR failed", result.error || "Please try another screenshot.");
      }
    } catch (err) {
      console.error("OCR failed:", err);
      error("OCR failed", err instanceof Error ? err.message : "Please try another screenshot.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCreatorSelection = (index: number) => {
    setDiscoveredCreators((prev) =>
      prev.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c))
    );
  };

  const handleAddSelected = async () => {
    const selected = discoveredCreators.filter((c) => c.selected);
    if (selected.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/brands/${brandId}/import-creators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creators: selected }),
      });

      if (response.ok) {
        onAddCreators?.(selected);
        setDiscoveredCreators([]);
        success("Creators added", `Added ${selected.length} creator${selected.length !== 1 ? "s" : ""} to leads.`);
        window.location.reload();
      } else {
        const result = await response.json();
        error("Import failed", result.error || "Could not add the selected creators.");
      }
    } catch (err) {
      console.error("Failed to import creators:", err);
      error("Import failed", err instanceof Error ? err.message : "Could not add the selected creators.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCount = discoveredCreators.filter((c) => c.selected).length;

  const platformColors: Record<string, string> = {
    instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
    tiktok: "bg-black",
    youtube: "bg-red-600",
    twitter: "bg-blue-400",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          Discover Creators
        </CardTitle>
        <CardDescription>
          Find new creators by searching the web, importing CSV, or scanning screenshots
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Tab buttons */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg mb-4">
          <button
            onClick={() => setActiveTab("external")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === "external" ? "bg-background shadow-sm" : "hover:bg-background/50"
            )}
          >
            <Globe className="h-4 w-4" />
            Web Search
          </button>
          <button
            onClick={() => setActiveTab("csv")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === "csv" ? "bg-background shadow-sm" : "hover:bg-background/50"
            )}
          >
            <Upload className="h-4 w-4" />
            CSV Import
          </button>
          <button
            onClick={() => setActiveTab("ocr")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === "ocr" ? "bg-background shadow-sm" : "hover:bg-background/50"
            )}
          >
            <Image className="h-4 w-4" />
            Screenshot OCR
          </button>
        </div>

        {/* External Web Search Tab */}
        {activeTab === "external" && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords *</Label>
                <Input
                  id="keywords"
                  placeholder="e.g., fitness, vegan food, tech reviews"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleExternalDiscover()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Location (optional)
                </Label>
                <Input
                  id="location"
                  placeholder="e.g., Austin TX, Los Angeles, NYC"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onChange={(e) => setPlatform(e.target.value as typeof platform)}>
                  <option value="all">All Platforms</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Follower Range</Label>
                <Select value={followerRange} onChange={(e) => setFollowerRange(e.target.value as typeof followerRange)}>
                  <option value="any">Any Size</option>
                  <option value="nano">Nano (1K-10K)</option>
                  <option value="micro">Micro (10K-50K)</option>
                  <option value="mid">Mid-tier (50K-500K)</option>
                  <option value="macro">Macro (500K+)</option>
                </Select>
              </div>
            </div>

            <Button onClick={handleExternalDiscover} disabled={isLoading || !keywords.trim()} className="w-full">
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              {isLoading ? "Searching the web..." : "Find Creators"}
            </Button>

            <p className="text-xs text-muted-foreground">
              💡 Searches across Instagram, TikTok, and YouTube to find real creator profiles matching your criteria.
            </p>
          </div>
        )}

        {/* CSV Import Tab */}
        {activeTab === "csv" && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="csv-input">Paste creator handles</Label>
              <Textarea
                id="csv-input"
                placeholder={"@username, platform, name, followers, location\n@fitness_jane, instagram, Jane Doe, 50K, Austin TX"}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Format: handle, platform (optional), name (optional), followers (optional), location (optional)
            </p>
            <Button onClick={handleCSVParse} disabled={isLoading || !csvText.trim()} className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Parse CSV
            </Button>
          </div>
        )}

        {/* OCR Tab */}
        {activeTab === "ocr" && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="ocr-upload">Upload screenshot</Label>
              <Input id="ocr-upload" type="file" accept="image/*" onChange={handleOCRUpload} className="cursor-pointer" />
            </div>
            {ocrPreview && (
              <div className="relative rounded-lg overflow-hidden border">
                <img src={ocrPreview} alt="Preview" className="max-h-48 w-full object-contain bg-muted" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => { setOcrFile(null); setOcrPreview(null); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Upload a screenshot from Instagram, TikTok, or any social platform. AI will extract creator handles.
            </p>
            <Button onClick={handleOCRProcess} disabled={isLoading || !ocrFile} className="w-full">
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {isLoading ? "Processing..." : "Extract Creators"}
            </Button>
          </div>
        )}

        {/* Discovered creators list */}
        {discoveredCreators.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Found Creators ({discoveredCreators.length})</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setDiscoveredCreators([])}>
                  Clear All
                </Button>
                <Button size="sm" onClick={handleAddSelected} disabled={selectedCount === 0 || isLoading}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add {selectedCount} Creator{selectedCount !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>

            <div className="grid gap-2 max-h-80 overflow-y-auto">
              {discoveredCreators.map((creator, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                    creator.selected ? "bg-primary/5 border-primary" : "bg-muted/50 border-transparent"
                  )}
                  onClick={() => toggleCreatorSelection(index)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-5 h-5 rounded flex items-center justify-center", creator.selected ? "bg-primary text-white" : "border")}>
                      {creator.selected && <Check className="h-3 w-3" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">@{creator.handle}</span>
                        {creator.name && <span className="text-muted-foreground">({creator.name})</span>}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {creator.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {creator.location}
                          </span>
                        )}
                        {creator.niche && <span>• {creator.niche}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {creator.followers && <span className="text-sm text-muted-foreground">{creator.followers}</span>}
                    <Badge variant="secondary" className={cn("text-white text-xs", platformColors[creator.platform])}>
                      {creator.platform}
                    </Badge>
                    {creator.confidence && (
                      <Badge variant="outline" className="text-xs">
                        {creator.confidence}%
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
