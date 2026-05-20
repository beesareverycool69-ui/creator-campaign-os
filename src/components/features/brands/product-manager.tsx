"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { createProduct } from "@/lib/actions/products";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  value: string | null;
  currency: string | null;
  weightGrams: number | null;
};

type ProductManagerProps = {
  brandId: string;
  products: Product[];
};

export function ProductManager({ brandId, products }: ProductManagerProps) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [isOpen, setIsOpen] = useState(products.length === 0);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      await createProduct({
        brandId,
        name: formData.get("name") as string,
        sku: (formData.get("sku") as string) || undefined,
        description: (formData.get("description") as string) || undefined,
        value: (formData.get("value") as string) || undefined,
        weightGrams: formData.get("weightGrams")
          ? parseInt(formData.get("weightGrams") as string, 10)
          : undefined,
      });

      success("Product added", "This product is now available for shipments.");
      form.reset();
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      showError("Failed to add product", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card id="products">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Products</CardTitle>
          <CardDescription>
            Add products you may ship to creators during campaigns.
          </CardDescription>
        </div>
        {!isOpen && (
          <Button size="sm" onClick={() => setIsOpen(true)}>
            + Add Product
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {products.length === 0 && !isOpen ? (
          <p className="text-sm text-muted-foreground">
            No products yet. Add your first product so it can be selected when creating shipments.
          </p>
        ) : products.length > 0 ? (
          <div className="space-y-2">
            {products.map((product) => (
              <div key={product.id} className="flex items-start justify-between rounded-lg border border-border bg-background/60 p-3">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {[product.sku && `SKU ${product.sku}`, product.value && `${product.currency || "USD"} ${product.value}`]
                      .filter(Boolean)
                      .join(" • ") || "Ready for shipments"}
                  </p>
                  {product.description && (
                    <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                  )}
                </div>
                {product.weightGrams && (
                  <span className="text-xs text-muted-foreground">{product.weightGrams}g</span>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {isOpen && (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card/70 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input id="name" name="name" required placeholder="Starter Kit" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" name="sku" placeholder="KIT-001" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={2} placeholder="What creators receive" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="value">Value</Label>
                <Input id="value" name="value" type="number" min="0" step="0.01" placeholder="49.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weightGrams">Weight (grams)</Label>
                <Input id="weightGrams" name="weightGrams" type="number" min="0" placeholder="500" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add Product"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
