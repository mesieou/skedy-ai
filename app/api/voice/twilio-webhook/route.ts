import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from './signature-verification';
import { SessionService } from '@/features/agent/sessions/sessionService';
import { handleCallEvent } from '@/features/agent/twilio/callRouter';
import { sentry } from '@/features/shared/utils/sentryService';
import { voiceRedisClient } from '@/features/agent/sessions/redisClient';
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

// Helper function to check if this is a demo call from website
async function checkIfDemoCall(): Promise<boolean> {
  try {
    const demoChoice = await voiceRedisClient.get('demo_choice:demo-user');
    return !!demoChoice; // Returns true if there's a stored demo choice
  } catch (error) {
    console.log('🔍 [Webhook] Demo choice check failed:', error);
    return false;
  }
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

    // 1️⃣ Verify webhook signature
    const verified = await verifyWebhookSignature(body, signature, timestamp, webhookId);
    assert(verified, 'Invalid webhook signature');

    console.log(`📞 Incoming call event: ${callId} (${event.type})`);

    // Check if this is a demo website phone call
    if (event.type === 'realtime.call.incoming') {
      const isDemoCall = await checkIfDemoCall();
      if (isDemoCall) {
        event.type = 'demo.phone.call';
        console.log(`🎭 [Webhook] Detected demo website phone call, switching event type`);
      }
    }

    // 2️⃣ Get or create session via SessionManager
    const session = await SessionService.createOrGet(callId, event);
    assert(session, 'Failed to create or get session');

    // Add success breadcrumb
    sentry.addBreadcrumb('Session created/retrieved successfully', 'webhook', {
      callId: callId,
      sessionId: session.id,
      businessId: session.businessId
    });

    // 3️⃣ Pass session and event to handler (async)
    handleCallEvent(session, event).catch((err: unknown) => {
      console.error('❌ Async processing error:', err);

      // Track async processing error
      sentry.trackError(err as Error, {
        sessionId: session.id,
        businessId: session.businessId,
        operation: 'async_call_event_processing',
        metadata: {
          eventType: event.type,
          callId: callId
        }
      });
    });

    // 4️⃣ Return fast to Twilio/OpenAI
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
