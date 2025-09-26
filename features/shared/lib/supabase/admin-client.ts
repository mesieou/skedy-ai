import { createClient } from '@supabase/supabase-js';
import { sentry } from '@/features/shared/utils/sentryService';

/**
 * Admin Supabase client with secret key for privileged operations
 * Use for: API routes, webhooks, background jobs, tests
 * Access: Full database access (bypasses RLS, no authentication needed)
 */
export function createSecretClient() {
  console.log(`🔧 [AdminClient] STEP α: Starting createSecretClient`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;

  console.log(`🔧 [AdminClient] STEP β: Environment variables loaded`);
  console.log(`🔧 [AdminClient] URL exists: ${!!supabaseUrl}`);
  console.log(`🔧 [AdminClient] Service key exists: ${!!serviceKey}`);
  console.log(`🔧 [AdminClient] URL: ${supabaseUrl}`);
  console.log(`🔧 [AdminClient] Service key prefix: ${serviceKey?.substring(0, 20)}...`);

  // Enhanced debugging for production issues using Sentry
  if (!supabaseUrl) {
    console.log(`🔧 [AdminClient] STEP γ: Missing SUPABASE_URL`);
    const error = new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
    sentry.trackError(error, {
      sessionId: 'admin-client-init',
      operation: 'admin_client_creation',
      metadata: { missingVar: 'NEXT_PUBLIC_SUPABASE_URL' }
    });
    throw error;
  }

  if (!serviceKey) {
    console.log(`🔧 [AdminClient] STEP γ: Missing SERVICE_KEY`);
    const error = new Error('SUPABASE_SECRET_KEY is not set');
    sentry.trackError(error, {
      sessionId: 'admin-client-init',
      operation: 'admin_client_creation',
      metadata: { missingVar: 'SUPABASE_SECRET_KEY' }
    });
    throw error;
  }

  console.log(`🔧 [AdminClient] STEP δ: Environment variables validated`);

  // Log service key info for debugging (without exposing the key)
  sentry.addBreadcrumb('Admin client configuration', 'supabase', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!serviceKey,
    serviceKeyLength: serviceKey.length,
    serviceKeyPrefix: serviceKey.substring(0, 10) + '...',
    environment: process.env.VERCEL_ENV || 'development'
  });

  // Validate service key format
  if (!serviceKey.startsWith('eyJ')) {
    console.log(`🔧 [AdminClient] STEP ε: Invalid service key format detected`);
    sentry.addBreadcrumb('Invalid service key format detected', 'supabase', {
      serviceKeyPrefix: serviceKey.substring(0, 10) + '...',
      expectedPrefix: 'eyJ'
    });
  }

  console.log(`🔧 [AdminClient] STEP ζ: About to create Supabase client`);
  const client = createClient(
    supabaseUrl,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  console.log(`🔧 [AdminClient] STEP η: Supabase client created successfully`);

  return client;
}

// Keep legacy export for compatibility
export const createAdminClient = createSecretClient;
