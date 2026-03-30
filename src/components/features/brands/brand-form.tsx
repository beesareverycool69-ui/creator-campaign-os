"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createBrand } from "@/lib/actions/brands";

const INDUSTRIES = [
  { value: "", label: "Select industry..." },
  { value: "fashion", label: "Fashion & Apparel" },
  { value: "beauty", label: "Beauty & Cosmetics" },
  { value: "tech", label: "Technology" },
  { value: "food", label: "Food & Beverage" },
  { value: "health", label: "Health & Wellness" },
  { value: "fitness", label: "Fitness & Sports" },
  { value: "travel", label: "Travel & Hospitality" },
  { value: "finance", label: "Finance & Fintech" },
  { value: "entertainment", label: "Entertainment & Media" },
  { value: "gaming", label: "Gaming" },
  { value: "home", label: "Home & Lifestyle" },
  { value: "automotive", label: "Automotive" },
  { value: "education", label: "Education" },
  { value: "other", label: "Other" },
];

export function BrandForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const brand = await createBrand({
        name: formData.get("name") as string,
        website: (formData.get("website") as string) || undefined,
        industry: (formData.get("industry") as string) || undefined,
        billingEmail: (formData.get("billingEmail") as string) || undefined,
      });

      router.push(`/brands/${brand.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create brand");
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name - required */}
          <div className="space-y-2">
            <Label htmlFor="name">Brand Name *</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Acme Inc."
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              type="url"
              placeholder="https://example.com"
            />
          </div>

          {/* Industry */}
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Select id="industry" name="industry">
              {INDUSTRIES.map((industry) => (
                <option key={industry.value} value={industry.value}>
                  {industry.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Billing Email */}
          <div className="space-y-2">
            <Label htmlFor="billingEmail">Billing Email</Label>
            <Input
              id="billingEmail"
              name="billingEmail"
              type="email"
              placeholder="billing@example.com"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Brand"}
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
