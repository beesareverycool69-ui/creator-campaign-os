"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Upload, X, Loader2, FileVideo, FileImage, Check } from "lucide-react";
import { submitContent } from "@/lib/actions/creator-portal";
import { cn } from "@/lib/utils/cn";

interface ContentUploadFormProps {
  token: string;
}

const CONTENT_TYPES = [
  { value: "reel", label: "Instagram Reel" },
  { value: "story", label: "Instagram Story" },
  { value: "post", label: "Instagram Post" },
  { value: "short", label: "YouTube Short" },
  { value: "video", label: "TikTok Video" },
  { value: "tweet", label: "Twitter/X Post" },
  { value: "other", label: "Other" },
];

export function ContentUploadForm({ token }: ContentUploadFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [contentType, setContentType] = useState<string>("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("video/") || f.type.startsWith("image/")
    );
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadToStorage = async (file: File): Promise<string> => {
    // In a real app, upload to Supabase Storage or similar
    // For now, create a placeholder URL
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const data = await response.json();
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentType || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload files
      const fileUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadToStorage(files[i]);
        fileUrls.push(url);
        setUploadProgress(Math.round(((i + 1) / files.length) * 80));
      }

      // Submit content
      await submitContent(token, {
        type: contentType as any,
        title: title || undefined,
        caption: caption || undefined,
        fileUrls,
      });

      setUploadProgress(100);
      setIsSuccess(true);

      // Reset form after delay
      setTimeout(() => {
        setFiles([]);
        setContentType("");
        setTitle("");
        setCaption("");
        setIsSuccess(false);
        setUploadProgress(0);
      }, 2000);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isSuccess) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-medium">Content Submitted!</h3>
        <p className="text-sm text-muted-foreground mt-1">
          We'll review your content and get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Drop zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          multiple
          accept="video/*,image/*"
          onChange={handleFileChange}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
          <p className="font-medium">
            Drag and drop your files here, or{" "}
            <span className="text-primary">browse</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            MP4, MOV, JPG, PNG up to 500MB
          </p>
        </label>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {file.type.startsWith("video/") ? (
                  <FileVideo className="h-8 w-8 text-blue-500" />
                ) : (
                  <FileImage className="h-8 w-8 text-green-500" />
                )}
                <div>
                  <p className="font-medium text-sm truncate max-w-[200px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeFile(i)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Form fields */}
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="content-type">Content Type *</Label>
          <Select
            id="content-type"
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
          >
            <option value="">Select content type</option>
            {CONTENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title (optional)</Label>
          <Input
            id="title"
            placeholder="Give your content a title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="caption">Caption / Notes (optional)</Label>
          <Textarea
            id="caption"
            placeholder="Add your planned caption or any notes..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      {/* Progress bar */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        className="w-full"
        disabled={isUploading || files.length === 0 || !contentType}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Submit Content
          </>
        )}
      </Button>
    </form>
  );
}
