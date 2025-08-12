import { createClient } from '@supabase/supabase-js';

/**
 * Admin Supabase client with secret key for privileged operations
 * Use for: API routes, webhooks, background jobs, tests
 * Access: Full database access (bypasses RLS, no authentication needed)
 */
export function createSecretClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!, // New secret key naming
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// Keep legacy export for compatibility
export const createAdminClient = createSecretClient;
