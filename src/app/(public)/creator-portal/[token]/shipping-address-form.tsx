"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savePortalShippingAddress } from "@/lib/actions/creator-portal";

type ShippingAddress = {
  recipientName: string;
  street1: string;
  street2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  phone: string | null;
};

type ShippingAddressFormProps = {
  token: string;
  address: ShippingAddress | null;
};

export function ShippingAddressForm({ token, address }: ShippingAddressFormProps) {
  const [savedAddress, setSavedAddress] = useState(address);
  const [isEditing, setIsEditing] = useState(!address);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      try {
        const saved = await savePortalShippingAddress(token, {
          recipientName: String(formData.get("recipientName") || ""),
          street1: String(formData.get("street1") || ""),
          street2: String(formData.get("street2") || ""),
          city: String(formData.get("city") || ""),
          state: String(formData.get("state") || ""),
          postalCode: String(formData.get("postalCode") || ""),
          country: String(formData.get("country") || ""),
          phone: String(formData.get("phone") || ""),
        });

        setSavedAddress(saved);
        setIsEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save address");
      }
    });
  }

  if (savedAddress && !isEditing) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card/70 p-4 text-sm">
          <p className="font-medium text-foreground">{savedAddress.recipientName}</p>
          <p>{savedAddress.street1}</p>
          {savedAddress.street2 && <p>{savedAddress.street2}</p>}
          <p>
            {savedAddress.city}, {savedAddress.state} {savedAddress.postalCode}
          </p>
          <p>{savedAddress.country}</p>
          {savedAddress.phone && <p>{savedAddress.phone}</p>}
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-primary">Shipping address saved ✓</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            Edit Address
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="recipientName">Recipient name *</Label>
          <Input
            id="recipientName"
            name="recipientName"
            required
            defaultValue={savedAddress?.recipientName || ""}
            placeholder="Full name"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="street1">Street address *</Label>
          <Input
            id="street1"
            name="street1"
            required
            defaultValue={savedAddress?.street1 || ""}
            placeholder="123 Main St"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="street2">Apartment, suite, etc.</Label>
          <Input
            id="street2"
            name="street2"
            defaultValue={savedAddress?.street2 || ""}
            placeholder="Apt 4B"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input id="city" name="city" required defaultValue={savedAddress?.city || ""} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">State/region *</Label>
          <Input id="state" name="state" required defaultValue={savedAddress?.state || ""} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="postalCode">Postal code *</Label>
          <Input
            id="postalCode"
            name="postalCode"
            required
            defaultValue={savedAddress?.postalCode || ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country *</Label>
          <Input
            id="country"
            name="country"
            required
            defaultValue={savedAddress?.country || "US"}
            placeholder="US"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="phone">Phone optional</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={savedAddress?.phone || ""}
            placeholder="Phone for carrier delivery updates"
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save Shipping Address"}
        </Button>
        {savedAddress && (
          <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
