"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { createShipment } from "@/lib/actions/shipments";

type Address = {
  id: string;
  label: string | null;
  recipientName: string;
  street1: string;
  street2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  isDefault: boolean | null;
};

type Product = {
  id: string;
  name: string;
  sku: string | null;
  value: string | null;
};

type ShipmentFormProps = {
  campaignCreatorId: string;
  campaignId: string;
  addresses: Address[];
  products: Product[];
};

const CARRIERS = [
  { value: "", label: "Select carrier..." },
  { value: "usps", label: "USPS" },
  { value: "fedex", label: "FedEx" },
  { value: "ups", label: "UPS" },
  { value: "dhl", label: "DHL" },
  { value: "other", label: "Other" },
];

export function ShipmentForm({
  campaignCreatorId,
  campaignId,
  addresses,
  products,
}: ShipmentFormProps) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<
    { productId: string; quantity: number }[]
  >([]);

  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];

  function addProduct() {
    if (products.length > 0) {
      setSelectedProducts([
        ...selectedProducts,
        { productId: products[0].id, quantity: 1 },
      ]);
    }
  }

  function removeProduct(index: number) {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  }

  function updateProduct(
    index: number,
    field: "productId" | "quantity",
    value: string | number
  ) {
    const updated = [...selectedProducts];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedProducts(updated);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      await createShipment({
        campaignCreatorId,
        addressId: formData.get("addressId") as string,
        carrier: (formData.get("carrier") as string) || undefined,
        notes: (formData.get("notes") as string) || undefined,
        items:
          selectedProducts.length > 0
            ? selectedProducts.map((p) => ({
                productId: p.productId,
                quantity: p.quantity,
              }))
            : undefined,
      });

      success("Shipment created", "Shipment record is ready.");
      router.push(`/campaigns/${campaignId}/creators/${campaignCreatorId}/shipment`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create shipment";
      setError(message);
      showError("Failed to create shipment", message);
      setLoading(false);
    }
  }

  if (addresses.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            This creator has no saved addresses.
          </p>
          <p className="text-sm text-muted-foreground">
            Please add an address to the creator profile first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Shipment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Address Selection */}
          <div className="space-y-2">
            <Label htmlFor="addressId">Shipping Address *</Label>
            <Select
              id="addressId"
              name="addressId"
              required
              defaultValue={defaultAddress?.id}
            >
              {addresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.label || "Address"} — {address.recipientName},{" "}
                  {address.city}, {address.state || ""} {address.postalCode}
                </option>
              ))}
            </Select>

            {/* Display selected address details */}
            {defaultAddress && (
              <div className="text-sm text-muted-foreground bg-card/70 border border-border p-3 rounded-md mt-2">
                <p className="font-medium">{defaultAddress.recipientName}</p>
                <p>{defaultAddress.street1}</p>
                {defaultAddress.street2 && <p>{defaultAddress.street2}</p>}
                <p>
                  {defaultAddress.city}, {defaultAddress.state}{" "}
                  {defaultAddress.postalCode}
                </p>
                <p>{defaultAddress.country}</p>
              </div>
            )}
          </div>

          {/* Products */}
          {products.length > 0 && (
            <div className="space-y-2">
              <Label>Products</Label>
              {selectedProducts.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={item.productId}
                    onChange={(e) =>
                      updateProduct(index, "productId", e.target.value)
                    }
                    className="flex-1"
                  >
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                        {product.sku && ` (${product.sku})`}
                        {product.value && ` — $${product.value}`}
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateProduct(index, "quantity", parseInt(e.target.value))
                    }
                    className="w-20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeProduct(index)}
                  >
                    ✕
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addProduct}>
                + Add Product
              </Button>
            </div>
          )}

          {/* Carrier */}
          <div className="space-y-2">
            <Label htmlFor="carrier">Carrier</Label>
            <Select id="carrier" name="carrier">
              {CARRIERS.map((carrier) => (
                <option key={carrier.value} value={carrier.value}>
                  {carrier.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Special instructions, gift message, etc."
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Shipment"}
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
