"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAgreement } from "@/lib/actions/agreements";

type AgreementFormProps = {
  campaignCreatorId: string;
  campaignId: string;
  defaultRate?: number;
  defaultRateType?: string;
};

const RATE_TYPES = [
  { value: "flat", label: "Flat Fee" },
  { value: "per_post", label: "Per Post" },
  { value: "per_view", label: "Per View (CPM)" },
  { value: "affiliate", label: "Affiliate Commission" },
];

const DEFAULT_TERMS = `1. SCOPE OF WORK
The Creator agrees to produce and publish content as specified in the campaign brief.

2. CONTENT REQUIREMENTS
- All content must be original and created specifically for this campaign
- Content must comply with platform guidelines and FTC disclosure requirements
- Brand must approve content before publication

3. TIMELINE
Creator will deliver content according to the agreed schedule.

4. PAYMENT
Payment will be made within 30 days of content delivery and approval.

5. USAGE RIGHTS
Brand receives a license to use the content as specified in the Usage Rights section.`;

export function AgreementForm({
  campaignCreatorId,
  campaignId,
  defaultRate,
  defaultRateType,
}: AgreementFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      await createAgreement({
        campaignCreatorId,
        title: (formData.get("title") as string) || undefined,
        terms: formData.get("terms") as string,
        compensation: {
          rate: parseFloat(formData.get("rate") as string) || 0,
          rateType: formData.get("rateType") as any,
          currency: "USD",
        },
        deliverables: (formData.get("deliverables") as string)
          .split("\n")
          .filter(Boolean),
        usageRights: (formData.get("usageRights") as string) || undefined,
        exclusivity: (formData.get("exclusivity") as string) || undefined,
        startDate: (formData.get("startDate") as string) || undefined,
        endDate: (formData.get("endDate") as string) || undefined,
      });

      router.push(`/campaigns/${campaignId}/creators/${campaignCreatorId}/agreement`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create agreement"
      );
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Agreement</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Agreement Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Creator Agreement"
              defaultValue="Creator Agreement"
            />
          </div>

          {/* Compensation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate">Rate ($) *</Label>
              <Input
                id="rate"
                name="rate"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={defaultRate}
                placeholder="500.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateType">Rate Type *</Label>
              <Select
                id="rateType"
                name="rateType"
                required
                defaultValue={defaultRateType || "flat"}
              >
                {RATE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Deliverables */}
          <div className="space-y-2">
            <Label htmlFor="deliverables">Deliverables (one per line) *</Label>
            <Textarea
              id="deliverables"
              name="deliverables"
              required
              rows={4}
              placeholder="1x Instagram Reel&#10;2x Instagram Stories&#10;1x TikTok video"
              defaultValue="1x Instagram Post\n2x Instagram Stories"
            />
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

          {/* Terms */}
          <div className="space-y-2">
            <Label htmlFor="terms">Terms & Conditions *</Label>
            <Textarea
              id="terms"
              name="terms"
              required
              rows={10}
              defaultValue={DEFAULT_TERMS}
            />
          </div>

          {/* Usage Rights */}
          <div className="space-y-2">
            <Label htmlFor="usageRights">Usage Rights</Label>
            <Textarea
              id="usageRights"
              name="usageRights"
              rows={3}
              placeholder="Brand may use the content on their owned channels for 12 months..."
              defaultValue="Brand receives a perpetual, non-exclusive license to use the content on owned and paid media channels."
            />
          </div>

          {/* Exclusivity */}
          <div className="space-y-2">
            <Label htmlFor="exclusivity">Exclusivity Clause</Label>
            <Textarea
              id="exclusivity"
              name="exclusivity"
              rows={2}
              placeholder="Creator agrees not to work with competing brands for 30 days..."
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Agreement"}
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
