// OpenAI Realtime SIP Webhook Handler - New Architecture
import { NextRequest, NextResponse } from 'next/server';
import { VoiceWebhookHandler } from '@/features/agent/voice/webhook-handler';
import { WebhookEvent } from '@/features/agent/voice/config';

// Initialize the voice webhook handler
let voiceHandler: VoiceWebhookHandler | null = null;
let handlerInitialized = false;

export async function POST(req: NextRequest) {
  // Initialize handler on first request (lazy initialization)
  if (!handlerInitialized) {
    voiceHandler = await VoiceWebhookHandler.initialize();
    handlerInitialized = true;
  }

  const rawBody = await req.text();

  // Log incoming webhook details
  console.log("📥 Incoming webhook request");
  console.log("📋 Headers:", Object.fromEntries(req.headers.entries()));
  console.log("📊 Raw body length:", rawBody.length);
  console.log("👀 Raw body preview:", rawBody.slice(0, 200));

  // Get signature headers
  const signatureHeader = req.headers.get("webhook-signature") || "";
  const timestamp = req.headers.get("webhook-timestamp") || "";
  const webhookId = req.headers.get("webhook-id") || "";

  // Verify webhook signature
  if (!voiceHandler!.verifyWebhookSignature(rawBody, signatureHeader, timestamp, webhookId)) {
    console.error("❌ Invalid webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse the webhook event
  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch (error) {
    console.error("❌ Failed to parse webhook body:", error);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Handle incoming call events
  if (event.type === 'realtime.call.incoming') {
    console.log(`📞 Handling incoming call event: ${event.data.call_id}`);

    // Handle the call with the new voice webhook handler
    await voiceHandler!.handleIncomingCall(event);

    // Return immediate response to webhook
    return NextResponse.json({
      status: "accepted",
      call_id: event.data.call_id,
      timestamp: new Date().toISOString()
    });
  }

  // Handle other event types if needed
  console.log(`ℹ️ Ignoring event type: ${event.type}`);
  return NextResponse.json({
    status: "ignored",
    event_type: event.type
  });
}
