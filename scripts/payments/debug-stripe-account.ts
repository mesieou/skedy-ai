#!/usr/bin/env tsx

/**
 * Debug Stripe Account Status
 * Usage: ./scripts/debug-stripe-account.ts <business-id>
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import { StripePaymentService } from '../../features/payments/stripe-utils';
import { BusinessRepository } from '../../features/shared/lib/database/repositories/business-repository';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

async function debugStripeAccount() {
  const businessId = process.argv[2];

  if (!businessId) {
    console.log('❌ Business ID required');
    console.log('Usage: ./scripts/debug-stripe-account.ts <business-id>');
    process.exit(1);
  }

  try {
    const businessRepo = new BusinessRepository();
    const business = await businessRepo.findOne({ id: businessId });

    if (!business) {
      console.log('❌ Business not found');
      return;
    }

    console.log('\n🏢 BUSINESS INFO:');
    console.log('================');
    console.log(`Name: ${business.name}`);
    console.log(`Email: ${business.email}`);
    console.log(`Stripe Account ID: ${business.stripe_connect_account_id || 'None'}`);
    console.log(`Stripe Status: ${business.stripe_account_status || 'None'}`);

    if (business.stripe_connect_account_id) {
      console.log('\n💳 STRIPE ACCOUNT INFO:');
      console.log('=======================');

      try {
        const account = await stripe.accounts.retrieve(business.stripe_connect_account_id);

        console.log(`Account ID: ${account.id}`);
        console.log(`Type: ${account.type}`);
        console.log(`Country: ${account.country}`);
        console.log(`Email: ${account.email}`);
        console.log(`Details Submitted: ${account.details_submitted}`);
        console.log(`Charges Enabled: ${account.charges_enabled}`);
        console.log(`Payouts Enabled: ${account.payouts_enabled}`);

        if (account.metadata) {
          console.log('\n📋 METADATA:');
          console.log('============');
          Object.entries(account.metadata).forEach(([key, value]) => {
            console.log(`${key}: ${value}`);
          });
        }

        if (account.requirements) {
          console.log('\n⚠️ REQUIREMENTS:');
          console.log('================');
          console.log(`Disabled Reason: ${account.requirements.disabled_reason || 'None'}`);
          console.log(`Currently Due: ${account.requirements.currently_due?.length || 0} items`);
          console.log(`Eventually Due: ${account.requirements.eventually_due?.length || 0} items`);

          if (account.requirements.currently_due?.length) {
            console.log('Currently Due Items:', account.requirements.currently_due);
          }
        }

        // Calculate what status should be
        let expectedStatus: 'pending' | 'active' | 'disabled' = 'pending';
        if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
          expectedStatus = 'active';
        } else if (account.requirements?.disabled_reason) {
          expectedStatus = 'disabled';
        }

        console.log('\n🎯 STATUS ANALYSIS:');
        console.log('==================');
        console.log(`Expected Status: ${expectedStatus}`);
        console.log(`Database Status: ${business.stripe_account_status || 'None'}`);
        console.log(`Status Match: ${expectedStatus === business.stripe_account_status ? '✅' : '❌'}`);

        if (expectedStatus !== business.stripe_account_status) {
          console.log('\n🔧 FIXING STATUS...');
          const result = await StripePaymentService.updateAccountStatus(businessId);
          if (result.success) {
            console.log(`✅ Status updated to: ${result.status}`);
          } else {
            console.log(`❌ Failed to update: ${result.error}`);
          }
        }

      } catch (error) {
        console.log(`❌ Error retrieving Stripe account: ${error}`);
      }
    } else {
      console.log('\n💡 No Stripe account found. Create one with:');
      console.log(`./scripts/create-onboarding-link-for-business.ts ${businessId}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugStripeAccount();
