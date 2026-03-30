"use server";

import { db } from "@/lib/db";
import { agreements, campaignCreators } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// =============================================================================
// TYPES
// =============================================================================
export type AgreementStatus =
  | "draft"
  | "pending_review"
  | "ready"
  | "sent"
  | "viewed"
  | "signed"
  | "countersigned"
  | "active"
  | "expired"
  | "terminated"
  | "superseded";

export type CreateAgreementInput = {
  campaignCreatorId: string;
  title?: string;
  terms: string;
  compensation: {
    rate: number;
    rateType: "flat" | "per_post" | "per_view" | "affiliate";
    currency?: string;
  };
  deliverables: string[];
  usageRights?: string;
  exclusivity?: string;
  startDate?: string;
  endDate?: string;
};

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get agreement for a campaign creator
 */
export async function getAgreement(campaignCreatorId: string) {
  const result = await db.query.agreements.findFirst({
    where: eq(agreements.campaignCreatorId, campaignCreatorId),
  });

  return result;
}

/**
 * Get agreement by ID with related data
 */
export async function getAgreementById(id: string) {
  const result = await db.query.agreements.findFirst({
    where: eq(agreements.id, id),
    with: {
      campaignCreator: {
        with: {
          campaign: {
            with: {
              brand: true,
            },
          },
          brandCreator: {
            with: {
              creator: true,
            },
          },
        },
      },
    },
  });

  return result;
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new agreement
 */
export async function createAgreement(input: CreateAgreementInput) {
  // Check if agreement already exists
  const existing = await getAgreement(input.campaignCreatorId);
  if (existing) {
    throw new Error("Agreement already exists for this campaign creator");
  }

  const compensationJson = JSON.stringify(input.compensation);
  const deliverablesJson = JSON.stringify(input.deliverables);

  const [newAgreement] = await db
    .insert(agreements)
    .values({
      campaignCreatorId: input.campaignCreatorId,
      title: input.title || "Creator Agreement",
      terms: input.terms,
      compensation: compensationJson,
      usageRights: input.usageRights || null,
      exclusivity: input.exclusivity || null,
      startDate: input.startDate || null,
      endDate: input.endDate || null,
      status: "draft",
    })
    .returning();

  // Get campaign ID for revalidation
  const cc = await db.query.campaignCreators.findFirst({
    where: eq(campaignCreators.id, input.campaignCreatorId),
    columns: { campaignId: true },
  });

  if (cc) {
    revalidatePath(`/campaigns/${cc.campaignId}/creators/${input.campaignCreatorId}`);
  }

  return newAgreement;
}

/**
 * Update agreement status
 */
export async function updateAgreementStatus(id: string, status: AgreementStatus) {
  const now = new Date();

  const updateData: Record<string, any> = {
    status,
    updatedAt: now,
  };

  // Set timestamps based on status
  switch (status) {
    case "sent":
      updateData.sentAt = now;
      break;
    case "signed":
      updateData.signedAt = now;
      break;
    case "countersigned":
      updateData.countersignedAt = now;
      break;
  }

  const [updated] = await db
    .update(agreements)
    .set(updateData)
    .where(eq(agreements.id, id))
    .returning();

  // Get campaign creator for revalidation
  const cc = await db.query.campaignCreators.findFirst({
    where: eq(campaignCreators.id, updated.campaignCreatorId),
    columns: { campaignId: true },
  });

  if (cc) {
    revalidatePath(`/campaigns/${cc.campaignId}/creators/${updated.campaignCreatorId}`);
    revalidatePath(`/campaigns/${cc.campaignId}/creators/${updated.campaignCreatorId}/agreement`);
  }

  return updated;
}

/**
 * Generate PDF from agreement and store in Supabase Storage
 */
export async function generateAgreementPDF(id: string): Promise<string> {
  const agreement = await getAgreementById(id);

  if (!agreement) {
    throw new Error("Agreement not found");
  }

  const { campaignCreator } = agreement;
  const creator = campaignCreator.brandCreator.creator;
  const brand = campaignCreator.campaign.brand;
  const campaign = campaignCreator.campaign;

  // Parse compensation
  let compensation = { rate: 0, rateType: "flat", currency: "USD" };
  try {
    compensation = JSON.parse(agreement.compensation || "{}");
  } catch {}

  // Generate HTML
  const html = generateAgreementHTML({
    title: agreement.title,
    brandName: brand.name,
    brandLogo: brand.logoUrl,
    creatorName: creator.name,
    creatorEmail: creator.email,
    campaignName: campaign.name,
    terms: agreement.terms,
    compensation,
    usageRights: agreement.usageRights,
    exclusivity: agreement.exclusivity,
    startDate: agreement.startDate,
    endDate: agreement.endDate,
    createdAt: agreement.createdAt,
  });

  // For now, we'll create a simple PDF using a data URL approach
  // In production, you'd use Puppeteer server-side
  // This is a placeholder that stores the HTML as a text file
  const supabase = await createClient();

  const fileName = `agreements/${id}/${Date.now()}.html`;
  const { data, error } = await supabase.storage
    .from("documents")
    .upload(fileName, html, {
      contentType: "text/html",
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload agreement: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("documents")
    .getPublicUrl(fileName);

  // Update agreement with document URL
  await db
    .update(agreements)
    .set({
      documentUrl: urlData.publicUrl,
      updatedAt: new Date(),
    })
    .where(eq(agreements.id, id));

  // Revalidate
  const cc = await db.query.campaignCreators.findFirst({
    where: eq(campaignCreators.id, agreement.campaignCreatorId),
    columns: { campaignId: true },
  });

  if (cc) {
    revalidatePath(`/campaigns/${cc.campaignId}/creators/${agreement.campaignCreatorId}/agreement`);
  }

  return urlData.publicUrl;
}

// =============================================================================
// HELPERS
// =============================================================================

function generateAgreementHTML(data: {
  title: string;
  brandName: string;
  brandLogo: string | null;
  creatorName: string;
  creatorEmail: string | null;
  campaignName: string;
  terms: string | null;
  compensation: { rate: number; rateType: string; currency: string };
  usageRights: string | null;
  exclusivity: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: Date;
}): string {
  const formattedDate = new Date(data.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${data.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #1a1a1a;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e5e5;
    }
    .logo {
      max-height: 60px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 24px;
      margin: 0;
    }
    .date {
      color: #666;
      margin-top: 10px;
    }
    .parties {
      display: flex;
      justify-content: space-between;
      margin: 30px 0;
      padding: 20px;
      background: #f9f9f9;
      border-radius: 8px;
    }
    .party {
      flex: 1;
    }
    .party-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .party-name {
      font-size: 18px;
      font-weight: 600;
      margin-top: 5px;
    }
    .section {
      margin: 30px 0;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #666;
      margin-bottom: 10px;
    }
    .section-content {
      white-space: pre-wrap;
    }
    .compensation {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
    }
    .compensation-type {
      font-size: 14px;
      color: #666;
    }
    .signatures {
      margin-top: 60px;
      display: flex;
      justify-content: space-between;
    }
    .signature-block {
      width: 45%;
    }
    .signature-line {
      border-top: 1px solid #1a1a1a;
      margin-top: 60px;
      padding-top: 10px;
    }
    .signature-label {
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    ${data.brandLogo ? `<img src="${data.brandLogo}" class="logo" alt="${data.brandName}">` : ""}
    <h1>${data.title}</h1>
    <div class="date">${formattedDate}</div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Brand</div>
      <div class="party-name">${data.brandName}</div>
    </div>
    <div class="party" style="text-align: right;">
      <div class="party-label">Creator</div>
      <div class="party-name">${data.creatorName}</div>
      ${data.creatorEmail ? `<div style="color: #666; font-size: 14px;">${data.creatorEmail}</div>` : ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Campaign</div>
    <div class="section-content">${data.campaignName}</div>
  </div>

  <div class="section">
    <div class="section-title">Compensation</div>
    <div class="compensation">
      $${data.compensation.rate.toLocaleString()} ${data.compensation.currency}
    </div>
    <div class="compensation-type">${data.compensation.rateType}</div>
  </div>

  ${data.terms ? `
  <div class="section">
    <div class="section-title">Terms & Conditions</div>
    <div class="section-content">${data.terms}</div>
  </div>
  ` : ""}

  ${data.usageRights ? `
  <div class="section">
    <div class="section-title">Usage Rights</div>
    <div class="section-content">${data.usageRights}</div>
  </div>
  ` : ""}

  ${data.exclusivity ? `
  <div class="section">
    <div class="section-title">Exclusivity</div>
    <div class="section-content">${data.exclusivity}</div>
  </div>
  ` : ""}

  ${data.startDate || data.endDate ? `
  <div class="section">
    <div class="section-title">Duration</div>
    <div class="section-content">
      ${data.startDate ? `Start: ${data.startDate}` : ""}
      ${data.startDate && data.endDate ? " — " : ""}
      ${data.endDate ? `End: ${data.endDate}` : ""}
    </div>
  </div>
  ` : ""}

  <div class="signatures">
    <div class="signature-block">
      <div class="signature-line">
        <div class="signature-label">${data.brandName} (Authorized Signature)</div>
      </div>
    </div>
    <div class="signature-block">
      <div class="signature-line">
        <div class="signature-label">${data.creatorName} (Creator Signature)</div>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}
