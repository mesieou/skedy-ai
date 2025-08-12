import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client with publishable key
 * Use for: Client components, React hooks, user interactions
 * Access: User's own data (requires authentication)
 */
export function createPublishableClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
  );
}

// Keep legacy export for compatibility
export const createClient = createPublishableClient;
