"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  ShipmentStatusBadge,
  ShipmentStatus,
  getShipmentStatusOptions,
} from "./shipment-status-badge";
import {
  updateShipmentStatus,
  updateTrackingInfo,
} from "@/lib/actions/shipments";

type ShipmentDetailProps = {
  shipment: {
    id: string;
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    status: string;
    notes: string | null;
    shippedAt: Date | null;
    estimatedDelivery: string | null;
    deliveredAt: Date | null;
    createdAt: Date;
    address: {
      recipientName: string;
      street1: string;
      street2: string | null;
      city: string;
      state: string | null;
      postalCode: string;
      country: string;
    };
    items: {
      quantity: number;
      product: {
        name: string;
        sku: string | null;
      };
    }[];
  };
};

const CARRIERS = [
  { value: "usps", label: "USPS" },
  { value: "fedex", label: "FedEx" },
  { value: "ups", label: "UPS" },
  { value: "dhl", label: "DHL" },
  { value: "other", label: "Other" },
];

export function ShipmentDetail({ shipment }: ShipmentDetailProps) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [status, setStatus] = useState<ShipmentStatus>(
    shipment.status as ShipmentStatus
  );
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tracking form state
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState(
    shipment.trackingNumber || ""
  );
  const [carrier, setCarrier] = useState(shipment.carrier || "");
  const [savingTracking, setSavingTracking] = useState(false);

  const statusOptions = getShipmentStatusOptions();

  async function handleStatusChange(newStatus: ShipmentStatus) {
    if (newStatus === status) return;

    setUpdating(true);
    setError(null);

    try {
      await updateShipmentStatus(shipment.id, newStatus);
      setStatus(newStatus);
      success("Shipment status updated", `Status changed to ${newStatus}.`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update status";
      setError(message);
      showError("Failed to update shipment", message);
      setStatus(shipment.status as ShipmentStatus);
    } finally {
      setUpdating(false);
    }
  }

  async function handleSaveTracking(e: React.FormEvent) {
    e.preventDefault();

    if (!trackingNumber || !carrier) {
      const message = "Please enter both tracking number and carrier";
      setError(message);
      showError("Tracking info required", message);
      return;
    }

    setSavingTracking(true);
    setError(null);

    try {
      await updateTrackingInfo(shipment.id, trackingNumber, carrier);
      setShowTrackingForm(false);
      success("Tracking updated", "Shipment tracking saved.");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update tracking";
      setError(message);
      showError("Failed to update tracking", message);
    } finally {
      setSavingTracking(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Shipment Status</span>
            <ShipmentStatusBadge status={status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select
              value={status}
              onChange={(e) =>
                handleStatusChange(e.target.value as ShipmentStatus)
              }
              disabled={updating}
              className="w-48"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.emoji} {option.label}
                </option>
              ))}
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Timeline */}
          <div className="text-sm text-muted-foreground space-y-1 pt-4 border-t">
            <p>
              Created:{" "}
              {new Date(shipment.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {shipment.shippedAt && (
              <p>
                Shipped:{" "}
                {new Date(shipment.shippedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
            {shipment.deliveredAt && (
              <p>
                Delivered:{" "}
                {new Date(shipment.deliveredAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tracking Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tracking Information</span>
            {!showTrackingForm && !shipment.trackingNumber && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTrackingForm(true)}
              >
                Add Tracking
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showTrackingForm ? (
            <form onSubmit={handleSaveTracking} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="carrier">Carrier</Label>
                  <Select
                    id="carrier"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                  >
                    <option value="">Select carrier...</option>
                    {CARRIERS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trackingNumber">Tracking Number</Label>
                  <Input
                    id="trackingNumber"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="1Z999AA10123456784"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={savingTracking}>
                  {savingTracking ? "Saving..." : "Save Tracking"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTrackingForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : shipment.trackingNumber ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize">
                    {shipment.carrier || "Unknown Carrier"}
                  </p>
                  <p className="font-mono text-sm">{shipment.trackingNumber}</p>
                </div>
                {shipment.trackingUrl && (
                  <a
                    href={shipment.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      Track Package →
                    </Button>
                  </a>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTrackingForm(true)}
              >
                Update Tracking
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No tracking information added yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Shipping Address */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Address</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            <p className="font-medium">{shipment.address.recipientName}</p>
            <p>{shipment.address.street1}</p>
            {shipment.address.street2 && <p>{shipment.address.street2}</p>}
            <p>
              {shipment.address.city}, {shipment.address.state}{" "}
              {shipment.address.postalCode}
            </p>
            <p>{shipment.address.country}</p>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      {shipment.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Items ({shipment.items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {shipment.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    {item.product.sku && (
                      <p className="text-sm text-muted-foreground">
                        SKU: {item.product.sku}
                      </p>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Qty: {item.quantity}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {shipment.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{shipment.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
