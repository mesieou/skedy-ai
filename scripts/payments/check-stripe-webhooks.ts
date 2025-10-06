#!/usr/bin/env tsx

/**
 * Check Stripe Webhook Configuration
 * Usage: ./scripts/check-stripe-webhooks.ts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load from project root .env.local
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function checkWebhooks() {
  try {
    console.log('🔍 Checking Stripe webhook endpoints...\n');

    const webhooks = await stripe.webhookEndpoints.list();

    if (webhooks.data.length === 0) {
      console.log('❌ No webhook endpoints configured!');
      console.log('\n💡 You need to create a webhook endpoint in Stripe Dashboard:');
      console.log('   1. Go to https://dashboard.stripe.com/webhooks');
      console.log('   2. Add endpoint: https://your-domain.com/api/payments/webhook');
      console.log('   3. Select events: account.updated, checkout.session.completed, etc.');
      return;
    }

    console.log(`✅ Found ${webhooks.data.length} webhook endpoint(s):\n`);

    webhooks.data.forEach((webhook, index) => {
      console.log(`📡 Webhook ${index + 1}:`);
      console.log(`   URL: ${webhook.url}`);
      console.log(`   Status: ${webhook.status}`);
      console.log(`   Events: ${webhook.enabled_events.length} configured`);

      const hasAccountUpdated = webhook.enabled_events.includes('account.');
      console.log(`   account.updated: ${hasAccountUpdated ? '✅' : '❌'}`);

      if (webhook.enabled_events.length > 0) {
        console.log(`   Enabled events: ${webhook.enabled_events.join(', ')}`);
      }
      console.log('');
    });

    // Check recent webhook events (all types)
    console.log('🔍 Checking recent webhook events (all types)...\n');

    const events = await stripe.events.list({
      limit: 20
    });

    if (events.data.length === 0) {
      console.log('❌ No recent events found');
      console.log('💡 This might mean events are older than 30 days (Stripe limit)');
    } else {
      console.log(`✅ Found ${events.data.length} recent events:\n`);

      events.data.forEach((event, index) => {
        console.log(`📋 Event ${index + 1}:`);
        console.log(`   ID: ${event.id}`);
        console.log(`   Type: ${event.type}`);
        console.log(`   Created: ${new Date(event.created * 1000).toISOString()}`);
        console.log(`   API Version: ${event.api_version || 'N/A'}`);
        console.log(`   Pending Webhooks: ${event.pending_webhooks}`);

        // Show object info based on event type
        if (event.type.startsWith('account.')) {
          const account = event.data.object as Stripe.Account;
          console.log(`   Account ID: ${account.id}`);
          console.log(`   Business ID: ${account.metadata?.businessId || 'None'}`);
          console.log(`   Charges Enabled: ${account.charges_enabled}`);
          console.log(`   Payouts Enabled: ${account.payouts_enabled}`);
        } else if (event.type.startsWith('checkout.session.')) {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log(`   Session ID: ${session.id}`);
          console.log(`   Payment Status: ${session.payment_status}`);
          console.log(`   Amount Total: ${session.amount_total ? (session.amount_total / 100) : 'N/A'}`);
          console.log(`   Quote ID: ${session.metadata?.quoteId || 'None'}`);
          console.log(`   Customer ID: ${session.metadata?.customerId || 'None'}`);
        } else if (event.type.startsWith('payment_intent.')) {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log(`   Payment Intent ID: ${paymentIntent.id}`);
          console.log(`   Status: ${paymentIntent.status}`);
          console.log(`   Amount: ${paymentIntent.amount / 100}`);
          console.log(`   Currency: ${paymentIntent.currency}`);
        } else if (event.type.startsWith('payment_link.')) {
          const paymentLink = event.data.object as Stripe.PaymentLink;
          console.log(`   Payment Link ID: ${paymentLink.id}`);
          console.log(`   Active: ${paymentLink.active}`);
          console.log(`   URL: ${paymentLink.url}`);
        }

        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error checking webhooks:', error);
  }
}

checkWebhooks();
