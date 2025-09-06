import OpenAI from 'openai';

export interface SignatureVerificationResult {
  isValid: boolean;
  headerSignature?: string;
  expectedSignature?: string;
}

export class SignatureService {
  private client: OpenAI;

  constructor(private webhookSecret: string) {
    this.client = new OpenAI({ webhookSecret: this.webhookSecret });
  }

  verifySignature(
    rawBody: string,
    signatureHeader: string,
    timestamp: string,
    webhookId?: string
  ): SignatureVerificationResult {
    console.log("🔐 Verifying webhook signature using OpenAI SDK...");
    console.log("🔍 Webhook secret available:", this.webhookSecret ? 'Yes' : 'No');
    console.log("🔍 Webhook secret length:", this.webhookSecret ? this.webhookSecret.length : 0);

    try {
      // Use OpenAI SDK's official webhook verification (just like Flask example)
      const headers = {
        'webhook-signature': signatureHeader,
        'webhook-timestamp': timestamp,
        'webhook-id': webhookId || 'unknown',
      };

      console.log("🔍 Using OpenAI SDK webhooks.unwrap() method");
      console.log("🔍 Timestamp:", timestamp);
      console.log("🔍 Raw body length:", rawBody.length);

      // This is equivalent to client.webhooks.unwrap(request.data, request.headers) in Flask
      // SDK expects string, not buffer
      this.client.webhooks.unwrap(rawBody, headers);

      console.log("✅ Signature verification passed via OpenAI SDK");
      return {
        isValid: true,
        headerSignature: signatureHeader.split(',')[1],
        expectedSignature: 'verified-by-openai-sdk',
      };

    } catch (error) {
      console.error("❌ Signature verification failed via OpenAI SDK:", error);

      return {
        isValid: false,
        headerSignature: signatureHeader.split(',')[1] || '',
        expectedSignature: 'sdk-verification-failed',
      };
    }
  }
}
