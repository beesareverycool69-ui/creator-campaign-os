type EnvName =
  | "DATABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"
  | "NEXT_PUBLIC_APP_URL"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "ANTHROPIC_API_KEY"
  | "BRAVE_API_KEY"
  | "SHOPIFY_WEBHOOK_SECRET"
  | "CONVERSION_WEBHOOK_SECRET"
  | "PORTAL_SECRET";

function formatMissingEnvMessage(names: string[]) {
  return [
    `Missing required environment variable${names.length === 1 ? "" : "s"}: ${names.join(", ")}.`,
    "Copy .env.example to .env.local and fill in the required values before running this feature.",
    "For Supabase, use Dashboard > Settings > API and Dashboard > Settings > Database.",
  ].join(" ");
}

export function getOptionalEnv(name: EnvName) {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

export function getRequiredEnv(name: EnvName) {
  const value = getOptionalEnv(name);

  if (!value) {
    throw new Error(formatMissingEnvMessage([name]));
  }

  return value;
}

export function getSupabasePublishableKey() {
  const value =
    getOptionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    getOptionalEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY");

  if (!value) {
    throw new Error(
      formatMissingEnvMessage([
        "NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
      ])
    );
  }

  return value;
}

export function getSupabaseBrowserEnv() {
  return {
    url: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: getSupabasePublishableKey(),
  };
}

export function getDatabaseUrl() {
  return getRequiredEnv("DATABASE_URL");
}
