/**
 * Client-side environment variable access
 *
 * This provides typed access to environment variables that are injected
 * at runtime via the root layout script tag.
 */

export interface ClientEnv {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  GOOGLE_ANALYTICS_ID?: string;
}

declare global {
  interface Window {
    __ENV: ClientEnv;
  }
}

/**
 * Get client-side environment variables with fallback
 */
export function getClientEnv(): ClientEnv {
  // Server-side fallback (during SSR)
  if (typeof window === 'undefined') {
    return {
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '',
      GOOGLE_ANALYTICS_ID: process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
    };
  }

  // Client-side access
  if (!window.__ENV) {
    throw new Error('Environment variables not loaded. Make sure the root layout script is working.');
  }

  return window.__ENV;
}

/**
 * Individual environment variable getters with validation
 */
export function getSupabaseUrl(): string {
  const env = getClientEnv();
  if (!env.SUPABASE_URL) {
    throw new Error('SUPABASE_URL is not configured');
  }
  return env.SUPABASE_URL;
}

export function getSupabasePublishableKey(): string {
  const env = getClientEnv();
  if (!env.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('SUPABASE_PUBLISHABLE_KEY is not configured');
  }
  return env.SUPABASE_PUBLISHABLE_KEY;
}

export function getGoogleAnalyticsId(): string | undefined {
  const env = getClientEnv();
  return env.GOOGLE_ANALYTICS_ID;
}
