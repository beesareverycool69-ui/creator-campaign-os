import { createHmac } from "crypto";

// Simple token generation - in production use a proper JWT or signed token
const SECRET = process.env.PORTAL_SECRET || "creator-portal-secret-change-me";

export function generatePortalToken(campaignCreatorId: string): string {
  const hmac = createHmac("sha256", SECRET);
  hmac.update(campaignCreatorId);
  const signature = hmac.digest("hex").substring(0, 16);
  return `${campaignCreatorId}-${signature}`;
}

export function validatePortalToken(token: string): string | null {
  const parts = token.split("-");
  if (parts.length < 2) return null;

  const signature = parts.pop();
  const campaignCreatorId = parts.join("-"); // handle UUIDs with dashes

  const expectedToken = generatePortalToken(campaignCreatorId);
  const expectedSignature = expectedToken.split("-").pop();

  if (signature === expectedSignature) {
    return campaignCreatorId;
  }
  return null;
}
