// OpenAI Realtime SIP Webhook Handler - MVP Token Optimized
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import OpenAI from 'openai';
import { MVPVoiceWebhookHandler } from '@/features/agent/voice/mvp-webhook-handler';

// Define WebhookEvent locally for type safety
interface WebhookEvent {
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

// ============================================================================
// WEBHOOK SIGNATURE VERIFICATION
// ============================================================================

async function verifyWebhookSignature(
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

// ============================================================================
// MAIN WEBHOOK HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let callId: string | undefined;
  let webhookId: string | undefined;

  try {
    console.log('📥 Incoming webhook request (MVP Token Optimized)');

    // Get headers
    const headersList = await headers();
    const signature = headersList.get('webhook-signature') || '';
    const timestamp = headersList.get('webhook-timestamp') || '';
    webhookId = headersList.get('webhook-id') || '';

    console.log('📋 Headers:', Object.fromEntries(headersList.entries()));

    // Get raw body
    const body = await request.text();
    console.log('📊 Raw body length:', body.length);
    console.log('👀 Raw body preview:', body.substring(0, 200) + '...');

    // Parse webhook event first to get call_id for idempotency check
    const event: WebhookEvent = JSON.parse(body);
    callId = event.data?.call_id;

    // 🕐 TIMESTAMP VALIDATION - Reject stale webhooks
    const eventCreatedAt = event.created_at;
    const now = Math.floor(Date.now() / 1000);

    // Reject webhooks older than 5 minutes (300 seconds)
    const MAX_WEBHOOK_AGE = 300;
    const webhookAge = now - eventCreatedAt;

    if (webhookAge > MAX_WEBHOOK_AGE) {
      console.log(`🕐 [Stale Webhook] Rejecting ${webhookAge}s old webhook for call ${callId}`);
      console.log(`   Event created: ${new Date(eventCreatedAt * 1000).toISOString()}`);
      console.log(`   Current time: ${new Date(now * 1000).toISOString()}`);

      return NextResponse.json({
        success: true,
        message: 'Webhook too old - likely already processed',
        agent_mode: 'mvp',
        webhook_age_seconds: webhookAge
      });
    }

    // 🛡️ IDEMPOTENCY CHECK - Prevent duplicate processing
    if (callId && webhookId) {
      const idempotencyKey = `webhook:${webhookId}:${callId}`;

      // Check Redis for existing processing attempt
      const { voiceRedisClient } = await import('@/features/agent/memory/redis');
      const existingResult = await voiceRedisClient.get(idempotencyKey);

      if (existingResult) {
        console.log(`🔄 [Idempotency] Webhook ${webhookId} already processed for call ${callId}`);
        const result = JSON.parse(existingResult);
        return NextResponse.json(result.response, { status: result.status });
      }

      // Mark as processing (short TTL to handle race conditions)
      await voiceRedisClient.set(`${idempotencyKey}:processing`, 'true', 30);
    }

    // Verify webhook signature
    if (!await verifyWebhookSignature(body, signature, timestamp, webhookId)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    console.log(`📞 Handling ${event.type} event: ${callId || 'unknown'}`);

    // Initialize MVP handler
    const handler = new MVPVoiceWebhookHandler();
    let processingResult: { success: boolean; error?: string } = { success: false };

    // Handle the event
    switch (event.type) {
      case 'realtime.call.incoming':
        processingResult = await handler.handleIncomingCallWithValidation(event);
        break;

      case 'realtime.call.ended':
        if (handler.handleCallEnd) {
          await handler.handleCallEnd(event.data.call_id, 'ended');
          processingResult = { success: true };
        }
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
        processingResult = { success: true }; // Don't fail on unknown events
        break;
    }

    const duration = Date.now() - startTime;
    const response = {
      success: processingResult.success,
      agent_mode: 'mvp',
      processing_time_ms: duration,
      ...(processingResult.error && { error: processingResult.error })
    };

    // Store result for idempotency (24 hour TTL)
    if (callId && webhookId) {
      const idempotencyKey = `webhook:${webhookId}:${callId}`;
      const { voiceRedisClient } = await import('@/features/agent/memory/redis');

      await voiceRedisClient.set(idempotencyKey, JSON.stringify({
        response,
        status: processingResult.success ? 200 : 500,
        timestamp: new Date().toISOString()
      }), 86400);

      // Clean up processing flag
      await voiceRedisClient.del(`${idempotencyKey}:processing`);
    }

    console.log(`✅ MVP Webhook processed successfully in ${duration}ms`);
    return NextResponse.json(response);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ MVP Webhook processing error:', error);

    // Clean up processing flag on error
    if (callId && webhookId) {
      try {
        const { voiceRedisClient } = await import('@/features/agent/memory/redis');
        await voiceRedisClient.del(`webhook:${webhookId}:${callId}:processing`);
      } catch (cleanupError) {
        console.error('❌ Failed to clean up processing flag:', cleanupError);
      }
    }

    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        agent_mode: 'mvp',
        processing_time_ms: duration
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    agent_mode: 'mvp',
    timestamp: new Date().toISOString(),
    features: {
      token_optimization: true,
      knowledge_caching: true,
      conversation_truncation: true,
      function_categories: {
        core_booking: 5,
        knowledge: 3,
        objection_handling: 1
      }
    }
  });
}
