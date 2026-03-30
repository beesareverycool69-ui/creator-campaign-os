"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCreator } from "@/lib/actions/creators";

const TIERS = [
  { value: "", label: "Select tier..." },
  { value: "nano", label: "Nano (1K-10K)" },
  { value: "micro", label: "Micro (10K-100K)" },
  { value: "mid", label: "Mid (100K-500K)" },
  { value: "macro", label: "Macro (500K-1M)" },
  { value: "mega", label: "Mega (1M+)" },
];

const COUNTRIES = [
  { value: "", label: "Select country..." },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "ES", label: "Spain" },
  { value: "IT", label: "Italy" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "JP", label: "Japan" },
  { value: "KR", label: "South Korea" },
  { value: "IN", label: "India" },
];

export function CreatorForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const creator = await createCreator({
        name: formData.get("name") as string,
        email: (formData.get("email") as string) || undefined,
        phone: (formData.get("phone") as string) || undefined,
        bio: (formData.get("bio") as string) || undefined,
        country: (formData.get("country") as string) || undefined,
        city: (formData.get("city") as string) || undefined,
        tier: (formData.get("tier") as any) || undefined,
      });

      router.push(`/creators/${creator.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create creator");
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Creator Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name - required */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Full name or display name"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="creator@example.com"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              placeholder="Brief description of the creator..."
              rows={3}
            />
          </div>

          {/* Country & City */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select id="country" name="country">
                {COUNTRIES.map((country) => (
                  <option key={country.value} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" placeholder="City" />
            </div>
          </div>

          {/* Tier */}
          <div className="space-y-2">
            <Label htmlFor="tier">Creator Tier</Label>
            <Select id="tier" name="tier">
              {TIERS.map((tier) => (
                <option key={tier.value} value={tier.value}>
                  {tier.label}
                </option>
              ))}
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Creator"}
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
