#!/usr/bin/env tsx

/**
 * Timezone-aware availability rollover cron job
 * Integrates with existing Kamatera deployment
 */

import cron from 'node-cron';

// Import the rollover runner
async function runRollover() {
  try {
    console.log('[AvailabilityCron] 🚀 Starting availability rollover cron job');

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
    } else {
      const errorMsg = `Rollover failed: ${response.status} ${response.statusText}`;
      console.error(`[AvailabilityCron] ❌ ${errorMsg}`);
    }
  } catch (error) {
    console.error(`[AvailabilityCron] ❌ Error during rollover:`, error.message);
  }
}

// Run every hour at minute 0
cron.schedule('0 * * * *', async () => {
  const currentTime = new Date().toISOString();
  console.log(`[AvailabilityCron] 🕐 Running availability rollover check at ${currentTime}`);

  await runRollover();
}, {
  scheduled: true,
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
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception in cron job:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled rejection in cron job:', reason);
  process.exit(1);
});
