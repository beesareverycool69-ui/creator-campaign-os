"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { addCreatorPlatform } from "@/lib/actions/creators";

const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "Twitter/X" },
  { value: "twitch", label: "Twitch" },
];

type AddPlatformFormProps = {
  creatorId: string;
};

export function AddPlatformForm({ creatorId }: AddPlatformFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      await addCreatorPlatform({
        creatorId,
        platformId: formData.get("platformId") as string,
        handle: formData.get("handle") as string,
        profileUrl: (formData.get("profileUrl") as string) || undefined,
        followerCount: formData.get("followerCount")
          ? parseInt(formData.get("followerCount") as string)
          : undefined,
        verified: formData.get("verified") === "on",
      });

      setIsOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add platform");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        + Add Platform
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="platformId">Platform *</Label>
          <Select id="platformId" name="platformId" required>
            <option value="">Select platform...</option>
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="handle">Handle *</Label>
          <Input
            id="handle"
            name="handle"
            required
            placeholder="username"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="followerCount">Followers</Label>
          <Input
            id="followerCount"
            name="followerCount"
            type="number"
            placeholder="10000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profileUrl">Profile URL</Label>
          <Input
            id="profileUrl"
            name="profileUrl"
            type="url"
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="verified" name="verified" />
        <Label htmlFor="verified" className="font-normal">
          Verified account
        </Label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Adding..." : "Add Platform"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setIsOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
