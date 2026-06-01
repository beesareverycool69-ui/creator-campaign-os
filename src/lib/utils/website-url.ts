const DEFAULT_WEBSITE_PROTOCOL = "https://";

export const WEBSITE_ACCESS_ERROR =
  "We couldn’t access this site. Try adding https:// or paste a specific page URL.";

export function normalizeWebsiteUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `${DEFAULT_WEBSITE_PROTOCOL}${trimmed}`;

  try {
    const url = new URL(withProtocol);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Unsupported website protocol");
    }

    if (!url.hostname.includes(".")) {
      throw new Error("Website must include a domain");
    }

    url.hash = "";
    return url.toString();
  } catch {
    throw new Error("Enter a valid website, like lego.com or https://lego.com.");
  }
}
