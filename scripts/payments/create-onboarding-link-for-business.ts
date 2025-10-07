#!/usr/bin/env tsx

/**
 * Create Stripe Onboarding Link
 * Usage: ./scripts/setup-stripe-onboarding.ts <business-id>
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env.production') });

import { StripePaymentService } from '../../features/payments/stripe-utils';

async function createOnboardingLink() {
  const businessId = process.argv[2];

  if (!businessId) {
    console.log('❌ Business ID required');
    console.log('Usage: ./scripts/setup-stripe-onboarding.ts <business-id>');
    process.exit(1);
  }

  try {
    const result = await StripePaymentService.createOnboardingLink(businessId);

    if (result.success) {
      console.log('✅ Onboarding link created:');
      console.log(result.url);
    } else {
      console.log('❌ Failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createOnboardingLink();
