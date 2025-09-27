import { createClient } from '@supabase/supabase-js';
import { sentry } from '@/features/shared/utils/sentryService';

/**
 * Admin Supabase client with secret key for privileged operations
 * Use for: API routes, webhooks, background jobs, tests
 * Access: Full database access (bypasses RLS, no authentication needed)
 */
export function createSecretClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;

  // Enhanced debugging for production issues using Sentry
  if (!supabaseUrl) {
    const error = new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
    sentry.trackError(error, {
      sessionId: 'admin-client-init',
      operation: 'admin_client_creation',
      metadata: { missingVar: 'NEXT_PUBLIC_SUPABASE_URL' }
    });
    throw error;
  }

  if (!serviceKey) {
    const error = new Error('SUPABASE_SECRET_KEY is not set');
    sentry.trackError(error, {
      sessionId: 'admin-client-init',
      operation: 'admin_client_creation',
      metadata: { missingVar: 'SUPABASE_SECRET_KEY' }
    });
    throw error;
  }

  // Log service key info for debugging (without exposing the key)
  sentry.addBreadcrumb('Admin client configuration', 'supabase', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!serviceKey,
    serviceKeyLength: serviceKey.length,
    serviceKeyPrefix: serviceKey.substring(0, 10) + '...',
    environment: process.env.NODE_ENV || 'development'
  });

  // Validate service key format
  if (!serviceKey.startsWith('eyJ')) {
    sentry.addBreadcrumb('Invalid service key format detected', 'supabase', {
      serviceKeyPrefix: serviceKey.substring(0, 10) + '...',
      expectedPrefix: 'eyJ'
    });
  }

  return createClient(
    supabaseUrl,
    serviceKey,
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
