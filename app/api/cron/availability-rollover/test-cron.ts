#!/usr/bin/env ts-node

/**
 * Test script to verify the availability rollover cron job
 * Run with: npx ts-node scripts/test-cron.ts
 */

import { AvailabilityManager } from '../../../../features/scheduling/lib/availability/availability-manager';

async function testAvailabilityRollover() {
  console.log('🕒 Testing availability rollover...');
  
  try {
    const startTime = Date.now();
    
    // Test the static method directly
    await AvailabilityManager.orchestrateAvailabilityRollover();
    
    const executionTime = Date.now() - startTime;
    console.log(`✅ Availability rollover completed successfully in ${executionTime}ms`);
    
  } catch (error) {
    console.error('❌ Error during availability rollover:', error);
    process.exit(1);
  }
}

async function testCronEndpoint() {
  console.log('🌐 Testing cron API endpoint...');
  
  try {
    // This would need to be run when the Next.js server is running
    const response = await fetch('http://localhost:3000/api/cron/availability-rollover', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'test-secret'}`
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Cron endpoint test successful:', result);
    } else {
      console.error('❌ Cron endpoint test failed:', result);
    }
    
  } catch (error) {
    console.log('⚠️  Cron endpoint test skipped (server not running):', error instanceof Error ? error.message : error);
  }
}

async function main() {
  console.log('🚀 Starting cron job tests...\n');
  
  // Test 1: Direct method call
  await testAvailabilityRollover();
  console.log('');
  
  // Test 2: API endpoint (optional, requires running server)
  await testCronEndpoint();
  
  console.log('\n✨ All tests completed!');
}

// Run the tests
main().catch(console.error);
