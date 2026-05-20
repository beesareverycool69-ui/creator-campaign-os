"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { submitContent } from "@/lib/actions/content";

type Platform = {
  id: string;
  platformId: string;
  handle: string;
};

type ContentUploadFormProps = {
  campaignCreatorId: string;
  campaignId: string;
  platforms: Platform[];
};

const CONTENT_TYPES = [
  { value: "post", label: "📷 Post" },
  { value: "story", label: "📱 Story" },
  { value: "reel", label: "🎬 Reel" },
  { value: "video", label: "🎥 Video" },
  { value: "short", label: "⚡ Short" },
  { value: "tweet", label: "🐦 Tweet" },
  { value: "other", label: "📄 Other" },
];

type UploadedFile = {
  url: string;
  name: string;
  type: string;
};

export function ContentUploadForm({
  campaignCreatorId,
  campaignId,
  platforms,
}: ContentUploadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    const supabase = createClient();
    const newFiles: UploadedFile[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");
        
        if (!isImage && !isVideo) {
          throw new Error(`Invalid file type: ${file.name}. Only images and videos are allowed.`);
        }

        // Create unique filename
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `content/${campaignId}/${campaignCreatorId}/${timestamp}-${sanitizedName}`;

        const { data, error: uploadError } = await supabase.storage
          .from("uploads")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("uploads")
          .getPublicUrl(data.path);

        newFiles.push({
          url: urlData.publicUrl,
          name: file.name,
          type: file.type,
        });

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      setUploadedFiles([...uploadedFiles, ...newFiles]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function removeFile(index: number) {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (uploadedFiles.length === 0) {
      setError("Please upload at least one file");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      await submitContent({
        campaignCreatorId,
        type: formData.get("type") as any,
        title: (formData.get("title") as string) || undefined,
        caption: (formData.get("caption") as string) || undefined,
        fileUrls: uploadedFiles.map((f) => f.url),
        thumbnailUrl: uploadedFiles[0]?.url,
        platformId: (formData.get("platformId") as string) || undefined,
        notes: (formData.get("notes") as string) || undefined,
      });

      router.push(`/campaigns/${campaignId}/creators/${campaignCreatorId}/content`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit content");
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Internal Content Upload</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Content Files *</Label>
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              {uploading ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground">Uploading...</p>
                  <div className="w-full bg-card/70 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-4xl mb-2">📁</p>
                  <p className="text-muted-foreground">
                    Click to upload images or videos
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports: JPG, PNG, GIF, MP4, MOV, WebM
                  </p>
                </>
              )}
            </div>

            {/* Uploaded files preview */}
            {uploadedFiles.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="relative group aspect-square bg-muted rounded-lg overflow-hidden"
                  >
                    {file.type.startsWith("video/") ? (
                      <video
                        src={file.url}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                      {file.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Content Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Content Type *</Label>
            <Select id="type" name="type" required defaultValue="post">
              {CONTENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Platform */}
          {platforms.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="platformId">Platform</Label>
              <Select id="platformId" name="platformId">
                <option value="">Select platform...</option>
                {platforms.map((platform) => (
                  <option key={platform.id} value={platform.platformId}>
                    {platform.platformId.charAt(0).toUpperCase() +
                      platform.platformId.slice(1)}{" "}
                    (@{platform.handle})
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g., Product Review Reel"
            />
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption">Caption / Script</Label>
            <Textarea
              id="caption"
              name="caption"
              rows={4}
              placeholder="The caption or script for this content..."
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes for Reviewer</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Any additional context for the brand..."
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-4">
            <Button type="submit" disabled={loading || uploading}>
              {loading ? "Saving..." : "Save Internal Upload"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
