import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Authenticated user server client with publishable key + cookies
 * Use for: Server components, server actions in app pages
 * Access: Logged-in user's data (via session cookies)
 * NOT for: API routes or webhooks (no user session)
 */
export async function createAuthenticatedServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}

// Keep legacy export for compatibility
export const createClient = createAuthenticatedServerClient;
