import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseUrl, getSupabasePublishableKey } from "../client-env";

/**
 * Browser Supabase client with publishable key
 * Use for: Client components, React hooks, user interactions
 * Access: User's own data (requires authentication)
 */
export function createPublishableClient() {
  return createBrowserClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
  );
}

// Keep legacy export for compatibility
export const createClient = createPublishableClient;
