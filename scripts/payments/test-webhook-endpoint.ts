#!/usr/bin/env tsx

/**
 * Test Webhook Endpoint
 * Usage: ./scripts/test-webhook-endpoint.ts
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

async function testWebhookEndpoint() {
  try {
    // Use the ngrok URL for development testing
    const webhookUrl = 'https://e2302a713bd8.ngrok-free.app/api/payments/webhook';

    console.log(`🔍 Testing webhook endpoint: ${webhookUrl}\n`);

    // Test if endpoint is reachable
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test-signature'
      },
      body: JSON.stringify({ test: 'webhook' })
    });

    console.log(`Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);

    if (response.status === 400) {
      console.log('✅ Endpoint is reachable (400 = signature validation failed, which is expected)');
    } else if (response.status === 404) {
      console.log('❌ Endpoint not found - check if your server is running');
    } else if (response.status === 500) {
      console.log('⚠️ Server error - check server logs');
    } else {
      console.log(`ℹ️ Unexpected status: ${response.status}`);
    }

    const text = await response.text();
    if (text) {
      console.log(`Response: ${text}`);
    }

  } catch (error) {
    console.error('❌ Error testing webhook endpoint:', error);
    console.log('\n💡 Make sure your development server is running:');
    console.log('   npm run dev');
  }
}

testWebhookEndpoint();
