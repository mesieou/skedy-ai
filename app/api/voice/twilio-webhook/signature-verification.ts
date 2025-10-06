import OpenAI from 'openai';
import type { Business } from '@/features/shared/lib/database/types/business';
import { BusinessRepository } from '@/features/shared/lib/database/repositories/business-repository';

export async function verifyWebhookSignature(
  body: string,
  signature: string,
  timestamp: string,
  webhookId: string,
  business: Business
): Promise<boolean> {
  try {
    const webhookSecret = BusinessRepository.getWebhookSecretForBusiness(business);
    if (!webhookSecret) {
      console.error(`❌ Missing webhook secret for business ${business.name} (${business.openai_api_key_name})`);
      return false;
    }

    console.log('🔐 Verifying webhook signature using OpenAI SDK...');
    console.log('🔍 Webhook secret available: Yes');
    console.log('🔍 Webhook secret length:', webhookSecret.length);
    console.log('🔍 Using OpenAI SDK webhooks.unwrap() method');
    console.log('🔍 Timestamp:', timestamp);
    console.log('🔍 Raw body length:', body.length);

    const apiKey = BusinessRepository.getApiKeyForBusiness(business);
    const openai = new OpenAI({
      apiKey: apiKey
    });
    console.log('🔍 OpenAI API Key:', apiKey);
    console.log('🔍 Webhook secret:', webhookSecret);
    console.log('🔍 Signature:', signature);
    console.log('🔍 Timestamp:', timestamp);
    console.log('🔍 Webhook ID:', webhookId);
    console.log('🔍 Body:', body);

    // Use OpenAI SDK's built-in webhook verification with all required headers
    await openai.webhooks.unwrap(
      body,
      {
        'webhook-signature': signature,
        'webhook-timestamp': timestamp,
        'webhook-id': webhookId
      },
      webhookSecret
    );


    console.log('✅ Signature verification passed via OpenAI SDK');
    return true;

  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error);
    return false;
  }
}
