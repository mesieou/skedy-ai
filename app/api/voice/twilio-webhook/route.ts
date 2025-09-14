import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from './signature-verification';
import { webSocketPool } from '@/features/agent/voice/web-socket-pool';
import { sessionManager } from '@/features/agent/voice/session-manager';
import { handleCallEvent } from '@/features/agent2/twilio/callHandler';

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
    const headersList = request.headers;
    const signature = headersList.get('webhook-signature') || '';
    const timestamp = headersList.get('webhook-timestamp') || '';
    const webhookId = headersList.get('webhook-id') || '';

    const body = await request.text();
    const event: WebhookEvent = JSON.parse(body);
    const callId = event.data?.call_id;

    if (!callId) {
      return NextResponse.json({ error: 'Missing call_id' }, { status: 400 });
    }

    // 1️⃣ Verify webhook signature
    const verified = await verifyWebhookSignature(body, signature, timestamp, webhookId);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    console.log(`📞 Incoming call event: ${callId} (${event.type})`);

    // 2️⃣ Get or create session via SessionManager
    const ws = webSocketPool.getNextAvailableSocket(); // pick WS from pool
    const session = sessionManager.getOrCreate(callId, ws);
    session.eventType = event.type; // update last event type

    // 3️⃣ Pass session and event to MVP handler (async)
    handleCallEvent(session, event).catch((err: unknown) => {
      console.error('❌ Async processing error:', err);
    });

    // 4️⃣ Return fast to Twilio/OpenAI
    return NextResponse.json({
      success: true,
      agent_mode: 'mvp',
      processing_time_ms: Date.now() - startTime,
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
