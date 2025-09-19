/**
 * Global Sentry Initialization for Skedy Voice Agent
 *
 * This file initializes Sentry globally for the entire Next.js application.
 * It runs once when the app starts and makes Sentry available everywhere.
 */

import { sentry } from '@/features/shared/utils/sentryService';

// Initialize Sentry globally
const initialized = sentry.init();

if (initialized) {
  console.log('🎯 [App] Sentry initialized globally - error tracking active');
} else {
  console.log('⚠️ [App] Sentry not initialized - running without error tracking');
}

// Export for any manual usage if needed
export { sentry };
