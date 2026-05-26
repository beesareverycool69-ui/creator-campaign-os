export const NO_DASH_COPY_RULE =
  "Never use em dashes (—) or en dashes (–) in generated copy. Use commas, periods, parentheses, or simple spaces instead. Normal hyphenated words are okay.";

/**
 * Removes typographic long dashes from AI-generated copy before it is shown or saved.
 * Keeps normal hyphens intact so words like "low-pressure" are not altered.
 */
export function sanitizeGeneratedText(text: string): string {
  return text.replace(/\s*[—–]\s*/g, ", ").replace(/\s{2,}/g, " ").trim();
}

export function sanitizeGeneratedCopy<T>(value: T): T {
  if (typeof value === "string") {
    return sanitizeGeneratedText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeGeneratedCopy(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeGeneratedCopy(item)])
    ) as T;
  }

  return value;
}
