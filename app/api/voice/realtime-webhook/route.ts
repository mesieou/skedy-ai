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

  try {
    console.log('📥 Incoming webhook request (MVP Token Optimized)');

    // Get headers
    const headersList = await headers();
    const signature = headersList.get('webhook-signature') || '';
    const timestamp = headersList.get('webhook-timestamp') || '';
    const webhookId = headersList.get('webhook-id') || '';

    console.log('📋 Headers:', Object.fromEntries(headersList.entries()));

    // Get raw body
    const body = await request.text();
    console.log('📊 Raw body length:', body.length);
    console.log('👀 Raw body preview:', body.substring(0, 200) + '...');

    // Verify webhook signature
    if (!await verifyWebhookSignature(body, signature, timestamp, webhookId)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Parse webhook event
    const event: WebhookEvent = JSON.parse(body);
    console.log(`📞 Handling ${event.type} event: ${event.data?.call_id || 'unknown'}`);

    // Initialize MVP handler
    const handler = new MVPVoiceWebhookHandler();

    // Handle the event
    switch (event.type) {
      case 'realtime.call.incoming':
        await handler.handleIncomingCall(event);
        break;

      case 'realtime.call.ended':
        if (handler.handleCallEnd) {
          await handler.handleCallEnd(event.data.call_id, 'ended');
        }
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
        break;
    }

    const duration = Date.now() - startTime;
    console.log(`✅ MVP Webhook processed successfully in ${duration}ms`);

    return NextResponse.json({
      success: true,
      agent_mode: 'mvp',
      processing_time_ms: duration
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ MVP Webhook processing error:', error);

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
