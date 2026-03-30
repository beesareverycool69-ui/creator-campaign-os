"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCampaign } from "@/lib/actions/campaigns";

type Brand = {
  id: string;
  name: string;
};

type CampaignFormProps = {
  brands: Brand[];
  defaultBrandId?: string;
};

const OBJECTIVES = [
  { value: "", label: "Select objective..." },
  { value: "awareness", label: "Brand Awareness" },
  { value: "engagement", label: "Engagement" },
  { value: "conversions", label: "Conversions / Sales" },
  { value: "content", label: "Content Creation" },
  { value: "other", label: "Other" },
];

export function CampaignForm({ brands, defaultBrandId }: CampaignFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const campaign = await createCampaign({
        brandId: formData.get("brandId") as string,
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || undefined,
        objective: (formData.get("objective") as any) || undefined,
        startDate: (formData.get("startDate") as string) || undefined,
        endDate: (formData.get("endDate") as string) || undefined,
        targetCreatorCount: formData.get("targetCreatorCount")
          ? parseInt(formData.get("targetCreatorCount") as string)
          : undefined,
      });

      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create campaign"
      );
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Brand - required */}
          <div className="space-y-2">
            <Label htmlFor="brandId">Brand *</Label>
            <Select
              id="brandId"
              name="brandId"
              required
              defaultValue={defaultBrandId || ""}
            >
              <option value="">Select brand...</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Name - required */}
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name *</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Summer 2024 Launch"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Campaign goals, key messaging, etc."
              rows={3}
            />
          </div>

          {/* Objective */}
          <div className="space-y-2">
            <Label htmlFor="objective">Objective</Label>
            <Select id="objective" name="objective">
              {OBJECTIVES.map((obj) => (
                <option key={obj.value} value={obj.value}>
                  {obj.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" name="startDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" name="endDate" type="date" />
            </div>
          </div>

          {/* Target creator count */}
          <div className="space-y-2">
            <Label htmlFor="targetCreatorCount">Target Creator Count</Label>
            <Input
              id="targetCreatorCount"
              name="targetCreatorCount"
              type="number"
              min="1"
              placeholder="10"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Campaign"}
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
