import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { getOptionalEnv } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

function getEncryptionKey() {
  const secret = getOptionalEnv("COMMERCE_CREDENTIAL_ENCRYPTION_KEY");

  if (!secret) {
    throw new Error(
      "COMMERCE_CREDENTIAL_ENCRYPTION_KEY is required to save commerce credentials."
    );
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export function decryptSecret(value: string) {
  const [version, iv, tag, encrypted] = value.split(":");

  if (version !== VERSION || !iv || !tag || !encrypted) {
    throw new Error("Unsupported encrypted secret format.");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
