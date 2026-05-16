"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { addCreatorToCampaign } from "@/lib/actions/campaign-creators";

type AvailableBrandCreator = {
  id: string;
  status: string;
  creator: {
    id: string;
    name: string;
    email: string | null;
    platforms: {
      platformId: string;
      handle: string;
      followerCount: number | null;
    }[];
  };
};

type AddCreatorToCampaignFormProps = {
  campaignId: string;
  availableCreators: AvailableBrandCreator[];
  preselectedBrandCreatorId?: string;
};

export function AddCreatorToCampaignForm({
  campaignId,
  availableCreators,
  preselectedBrandCreatorId,
}: AddCreatorToCampaignFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPreselectedCreator = Boolean(
    preselectedBrandCreatorId &&
      availableCreators.some((bc) => bc.id === preselectedBrandCreatorId)
  );
  const [isOpen, setIsOpen] = useState(hasPreselectedCreator);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      await addCreatorToCampaign({
        campaignId,
        brandCreatorId: formData.get("brandCreatorId") as string,
      });

      setIsOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add creator to campaign"
      );
    } finally {
      setLoading(false);
    }
  }

  if (availableCreators.length === 0 && !isOpen) {
    return (
      <div className="text-sm text-muted-foreground">
        No available creators.{" "}
        <span className="text-primary">
          Add creators to the brand first.
        </span>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        + Add Creator
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border rounded-lg p-4 space-y-4 bg-muted/50"
    >
      <div className="space-y-2">
        <Label htmlFor="brandCreatorId">Select Creator *</Label>
        <Select
          id="brandCreatorId"
          name="brandCreatorId"
          required
          defaultValue={hasPreselectedCreator ? preselectedBrandCreatorId : ""}
        >
          <option value="">Choose a creator...</option>
          {availableCreators.map((bc) => {
            const primaryPlatform = bc.creator.platforms[0];
            const followers = primaryPlatform?.followerCount;

            return (
              <option key={bc.id} value={bc.id}>
                {bc.creator.name}
                {primaryPlatform &&
                  ` (@${primaryPlatform.handle}${
                    followers ? ` • ${formatFollowers(followers)}` : ""
                  })`}
              </option>
            );
          })}
        </Select>
        <p className="text-xs text-muted-foreground">
          Only creators already linked to this brand are shown.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Adding..." : "Add to Campaign"}
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

function formatFollowers(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}
