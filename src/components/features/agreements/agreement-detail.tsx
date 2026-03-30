"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  AgreementStatusBadge,
  AgreementStatus,
  getAgreementStatusOptions,
} from "./agreement-status-badge";
import {
  updateAgreementStatus,
  generateAgreementPDF,
} from "@/lib/actions/agreements";

type AgreementDetailProps = {
  agreement: {
    id: string;
    title: string;
    terms: string | null;
    compensation: string | null;
    usageRights: string | null;
    exclusivity: string | null;
    startDate: string | null;
    endDate: string | null;
    documentUrl: string | null;
    status: string;
    sentAt: Date | null;
    signedAt: Date | null;
    countersignedAt: Date | null;
    createdAt: Date;
  };
};

export function AgreementDetail({ agreement }: AgreementDetailProps) {
  const router = useRouter();
  const [status, setStatus] = useState<AgreementStatus>(
    agreement.status as AgreementStatus
  );
  const [updating, setUpdating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusOptions = getAgreementStatusOptions();

  // Parse compensation
  let compensation = { rate: 0, rateType: "flat", currency: "USD" };
  try {
    compensation = JSON.parse(agreement.compensation || "{}");
  } catch {}

  async function handleStatusChange(newStatus: AgreementStatus) {
    if (newStatus === status) return;

    setUpdating(true);
    setError(null);

    try {
      await updateAgreementStatus(agreement.id, newStatus);
      setStatus(newStatus);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
      setStatus(agreement.status as AgreementStatus);
    } finally {
      setUpdating(false);
    }
  }

  async function handleGeneratePDF() {
    setGenerating(true);
    setError(null);

    try {
      const url = await generateAgreementPDF(agreement.id);
      // Open in new tab
      window.open(url, "_blank");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Agreement Status</span>
            <AgreementStatusBadge status={status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Select
              value={status}
              onChange={(e) =>
                handleStatusChange(e.target.value as AgreementStatus)
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

            <Button
              variant="outline"
              onClick={handleGeneratePDF}
              disabled={generating}
            >
              {generating ? "Generating..." : "📄 Generate PDF"}
            </Button>

            {agreement.documentUrl && (
              <a
                href={agreement.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">📥 Download</Button>
              </a>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Timeline */}
          <div className="text-sm text-muted-foreground space-y-1 pt-4 border-t">
            <p>
              Created:{" "}
              {new Date(agreement.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {agreement.sentAt && (
              <p>
                Sent:{" "}
                {new Date(agreement.sentAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
            {agreement.signedAt && (
              <p>
                Signed:{" "}
                {new Date(agreement.signedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
            {agreement.countersignedAt && (
              <p>
                Countersigned:{" "}
                {new Date(agreement.countersignedAt).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }
                )}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compensation */}
      <Card>
        <CardHeader>
          <CardTitle>Compensation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            ${compensation.rate.toLocaleString()} {compensation.currency}
          </div>
          <div className="text-muted-foreground capitalize">
            {compensation.rateType.replace("_", " ")}
          </div>
        </CardContent>
      </Card>

      {/* Duration */}
      {(agreement.startDate || agreement.endDate) && (
        <Card>
          <CardHeader>
            <CardTitle>Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              {agreement.startDate && `Start: ${agreement.startDate}`}
              {agreement.startDate && agreement.endDate && " — "}
              {agreement.endDate && `End: ${agreement.endDate}`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Terms */}
      {agreement.terms && (
        <Card>
          <CardHeader>
            <CardTitle>Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm">{agreement.terms}</pre>
          </CardContent>
        </Card>
      )}

      {/* Usage Rights */}
      {agreement.usageRights && (
        <Card>
          <CardHeader>
            <CardTitle>Usage Rights</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{agreement.usageRights}</p>
          </CardContent>
        </Card>
      )}

      {/* Exclusivity */}
      {agreement.exclusivity && (
        <Card>
          <CardHeader>
            <CardTitle>Exclusivity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{agreement.exclusivity}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
