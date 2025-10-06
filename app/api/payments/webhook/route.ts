import { NextRequest, NextResponse } from 'next/server';
import { StripePaymentService } from '@/features/payments/stripe-utils';
import { sentry } from '@/features/shared/utils/sentryService';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Add breadcrumb for webhook processing
    sentry.addBreadcrumb('Processing Stripe webhook', 'stripe-webhook', {
      url: request.url,
      method: request.method
    });

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    const event = StripePaymentService.verifyStripeWebhookSignature(body, signature);
    if (!event) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log(`💰 Processing Stripe event: ${event.type}`);

    // Handle the webhook event (includes both database and session updates)
    await StripePaymentService.handleStripeWebhook(event);

    const duration = Date.now() - startTime;

    // Success breadcrumb
    sentry.addBreadcrumb('Stripe webhook processed successfully', 'stripe-webhook', {
      eventType: event.type,
      duration: duration
    });

    return NextResponse.json({ received: true });

  } catch (error) {
    const duration = Date.now() - startTime;

    // Track error in Sentry
    sentry.trackError(error as Error, {
      sessionId: 'webhook',
      businessId: 'unknown',
      operation: 'stripe_webhook_processing',
      metadata: {
        duration: duration,
        errorName: (error as Error).name
      }
    });

    console.error('Error processing Stripe webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
