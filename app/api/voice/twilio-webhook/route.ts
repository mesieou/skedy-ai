import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from './signature-verification';
import { SessionService } from '@/features/agent/sessions/sessionService';
import { handleCallEvent } from '@/features/agent/twilio/callRouter';
import { sentry } from '@/features/shared/utils/sentryService';
import assert from 'assert';

// Define WebhookEvent locally for type safety
export interface WebhookEvent {
  id: string;
  object: string;
  created_at: number;
  type: string;
  data: {
    call_id: string;
    sip_headers?: Array<{
      name: string;
      value: string;
    }>;
    [key: string]: unknown;
  };
}


//Post request
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Add breadcrumb for webhook processing
    sentry.addBreadcrumb('Processing Twilio webhook', 'webhook', {
      url: request.url,
      method: request.method
    });

    const headersList = request.headers;
    const signature = headersList.get('webhook-signature') || '';
    const timestamp = headersList.get('webhook-timestamp') || '';
    const webhookId = headersList.get('webhook-id') || '';

    const body = await request.text();
    const event: WebhookEvent = JSON.parse(body);
    const callId = event.data?.call_id;

    // Validate required fields
    assert(callId, 'Missing call_id in webhook event');
    assert(event.type, 'Missing event type in webhook');

    // Add breadcrumb for call event
    sentry.addBreadcrumb(`Processing call event: ${event.type}`, 'webhook', {
      callId: callId,
      eventType: event.type
    });

    console.log(`📞 Incoming call event: ${callId} (${event.type})`);

    // 1️⃣ Get or create session via SessionManager (this determines the business correctly)
    const session = await SessionService.createOrGet(callId, event);
    assert(session, 'Failed to create or get session');
    console.log(`🚀 [Webhook] Session created/retrieved successfully: ${session.id}`);
    console.log(`🏢 [Webhook] Business: ${session.businessEntity.name} (${session.businessEntity.openai_api_key_name})`);

    // 2️⃣ Verify webhook signature with business-specific secret from session
    const verified = await verifyWebhookSignature(body, signature, timestamp, webhookId, session.businessEntity);
    assert(verified, 'Invalid webhook signature');

    // Add success breadcrumb
    sentry.addBreadcrumb('Session created/retrieved successfully', 'webhook', {
      callId: callId,
      sessionId: session.id,
      businessId: session.businessId
    });

    // 3️⃣ Pass session and event to handler (AWAIT to prevent serverless termination)
    console.log(`🚀 [Webhook] Starting handleCallEvent for session: ${session.id}`);
    try {
      await handleCallEvent(session, event);
      console.log(`✅ [Webhook] handleCallEvent completed successfully for session: ${session.id}`);
    } catch (err) {
      console.error('❌ Call event processing error:', err);

      // Track call event processing error
      sentry.trackError(err as Error, {
        sessionId: session.id,
        businessId: session.businessId,
        operation: 'call_event_processing',
        metadata: {
          eventType: event.type,
          callId: callId
        }
      });

      // Don't throw - still return success to webhook caller
      console.log(`⚠️ [Webhook] Continuing despite handleCallEvent error for session: ${session.id}`);
    }

    // 4️⃣ Return to Twilio/OpenAI after processing is complete
    const processingTime = Date.now() - startTime;
    console.log(`✅ Webhook processed in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      agent_mode: 'agent2',
      processing_time_ms: processingTime,
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Webhook processing error:', error);

    // Track webhook error in Sentry
    sentry.trackError(error as Error, {
      sessionId: 'unknown',
      businessId: 'unknown',
      operation: 'twilio_webhook_processing',
      metadata: {
        processingTime,
        url: request.url,
        method: request.method,
        hasHeaders: !!request.headers,
        errorName: (error as Error).name
      }
    });

    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
