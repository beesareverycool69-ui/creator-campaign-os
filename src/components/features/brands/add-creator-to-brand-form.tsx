"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { addCreatorToBrand, LeadStatus } from "@/lib/actions/brand-creators";
import { getLeadStatusOptions } from "./lead-status-badge";

type Creator = {
  id: string;
  name: string;
  email: string | null;
};

type AddCreatorToBrandFormProps = {
  brandId: string;
  availableCreators: Creator[];
};

const SOURCES = [
  { value: "", label: "Select source..." },
  { value: "instagram_search", label: "Instagram Search" },
  { value: "tiktok_search", label: "TikTok Search" },
  { value: "youtube_search", label: "YouTube Search" },
  { value: "referral", label: "Referral" },
  { value: "inbound", label: "Inbound (they reached out)" },
  { value: "agency", label: "Agency" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
];

export function AddCreatorToBrandForm({
  brandId,
  availableCreators,
}: AddCreatorToBrandFormProps) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const statusOptions = getLeadStatusOptions();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      await addCreatorToBrand({
        brandId,
        creatorId: formData.get("creatorId") as string,
        status: (formData.get("status") as LeadStatus) || "discovered",
        source: (formData.get("source") as string) || undefined,
        sourceDetail: (formData.get("sourceDetail") as string) || undefined,
      });

      setIsOpen(false);
      success("Creator added", "The creator was added to this brand.");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add creator";
      setError(message);
      showError("Failed to add creator", message);
    } finally {
      setLoading(false);
    }
  }

  if (availableCreators.length === 0 && !isOpen) {
    return (
      <div className="text-sm text-muted-foreground">
        No creators available to add.{" "}
        <a href="/creators/new" className="text-primary hover:underline">
          Create one first
        </a>
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
      <div className="grid grid-cols-2 gap-4">
        {/* Creator select */}
        <div className="space-y-2">
          <Label htmlFor="creatorId">Creator *</Label>
          <Select id="creatorId" name="creatorId" required>
            <option value="">Select creator...</option>
            {availableCreators.map((creator) => (
              <option key={creator.id} value={creator.id}>
                {creator.name} {creator.email ? `(${creator.email})` : ""}
              </option>
            ))}
          </Select>
        </div>

        {/* Initial status */}
        <div className="space-y-2">
          <Label htmlFor="status">Initial Status</Label>
          <Select id="status" name="status" defaultValue="discovered">
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Source */}
        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Select id="source" name="source">
            {SOURCES.map((source) => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Source detail */}
        <div className="space-y-2">
          <Label htmlFor="sourceDetail">Source Detail</Label>
          <Input
            id="sourceDetail"
            name="sourceDetail"
            placeholder="e.g., #skincare hashtag"
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Adding..." : "Add to Brand"}
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
