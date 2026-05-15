import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseBrowserEnv } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (browserClient) return browserClient;

  const { url, publishableKey } = getSupabaseBrowserEnv();

  browserClient = createBrowserClient(url, publishableKey);

  return browserClient;
}
