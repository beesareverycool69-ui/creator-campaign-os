import { createHmac, timingSafeEqual } from "crypto";

export function isProduction() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

export function verifyHexHmacSignature(body: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return safeCompare(signature, expected);
}

export function verifyBase64HmacSignature(body: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(body, "utf8").digest("base64");
  return safeCompare(signature, expected);
}

function safeCompare(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}
