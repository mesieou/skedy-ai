import OpenAI from 'openai';

export async function verifyWebhookSignature(
  body: string,
  signature: string,
  timestamp: string,
  webhookId: string
): Promise<boolean> {
  try {
    const webhookSecret = process.env.OPENAI_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('❌ Missing OPENAI_WEBHOOK_SECRET');
      return false;
    }

    console.log('🔐 Verifying webhook signature using OpenAI SDK...');
    console.log('🔍 Webhook secret available: Yes');
    console.log('🔍 Webhook secret length:', webhookSecret.length);
    console.log('🔍 Using OpenAI SDK webhooks.unwrap() method');
    console.log('🔍 Timestamp:', timestamp);
    console.log('🔍 Raw body length:', body.length);

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });

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
