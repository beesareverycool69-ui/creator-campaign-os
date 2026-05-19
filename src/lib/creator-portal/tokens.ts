import { createHmac } from "crypto";

const DEVELOPMENT_PORTAL_SECRET = "creator-portal-secret-change-me";

function getPortalSecret() {
  const secret = process.env.PORTAL_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("PORTAL_SECRET is required in production");
  }

  return DEVELOPMENT_PORTAL_SECRET;
}

export function generatePortalToken(campaignCreatorId: string): string {
  const hmac = createHmac("sha256", getPortalSecret());
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
