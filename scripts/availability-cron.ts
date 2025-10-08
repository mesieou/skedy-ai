#!/usr/bin/env tsx

/**
 * Timezone-aware availability rollover cron job
 * Integrates with existing Kamatera deployment
 */

import cron from 'node-cron';
import * as Sentry from '@sentry/node';

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
});

// Import the rollover runner
async function runRollover(): Promise<void> {
  try {
    console.log('[AvailabilityCron] 🚀 Starting availability rollover cron job');

    Sentry.addBreadcrumb({
      message: 'Starting availability rollover cron job',
      category: 'cron-rollover',
      level: 'info',
    });

    // Make HTTP request to our existing API endpoint
    const apiUrl = process.env.NODE_ENV === 'production'
      ? 'http://skedy-app:3000/api/cron/availability-rollover'  // Docker Compose service name
      : 'http://localhost:3000/api/cron/availability-rollover';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'fallback-secret'}`
      }
    });

    if (response.ok) {
      const result = await response.text();
      console.log(`[AvailabilityCron] ✅ Rollover completed: ${result}`);

      Sentry.addBreadcrumb({
        message: 'Availability rollover completed successfully',
        category: 'cron-rollover',
        level: 'info',
        data: { responseText: result },
      });
    } else {
      const errorMsg = `Rollover failed: ${response.status} ${response.statusText}`;
      console.error(`[AvailabilityCron] ❌ ${errorMsg}`);

      const error = new Error(errorMsg);
      Sentry.captureException(error);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[AvailabilityCron] ❌ Error during rollover:`, errorMessage);

    Sentry.captureException(error instanceof Error ? error : new Error(errorMessage));
  }
}

// Run every hour at minute 0 to check all timezones
cron.schedule('0 * * * *', async () => {
  const currentTime = new Date().toISOString();
  console.log(`[AvailabilityCron] 🕐 Running availability rollover check at ${currentTime}`);

  Sentry.addBreadcrumb({
    message: 'Cron job triggered',
    category: 'cron-schedule',
    level: 'info',
    data: {
      currentTime,
      timezone: 'UTC',
    },
  });

  await runRollover();
}, {
  timezone: "UTC" // Run in UTC, let the API handle timezone logic
});

console.log('🚀 Availability rollover cron job started - runs every hour');
console.log('📡 Using existing API endpoint: /api/cron/availability-rollover');

// Keep the process alive
process.on('SIGINT', () => {
  console.log('👋 Availability cron job stopped');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('💥 Uncaught exception in cron job:', error.message);
  Sentry.captureException(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  const errorMessage = reason instanceof Error ? reason.message : String(reason);
  console.error('💥 Unhandled rejection in cron job:', errorMessage);
  Sentry.captureException(reason instanceof Error ? reason : new Error(`Unhandled rejection: ${errorMessage}`));
  process.exit(1);
});
