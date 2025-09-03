// OpenAI Realtime SIP Webhook Handler
import { NextRequest, NextResponse } from 'next/server';
import { WebhookHandler } from '@/features/agent/voice/webhook-handler';
import { WebhookEvent } from '@/features/agent/voice/config';

// Initialize the webhook handler
const webhookHandler = new WebhookHandler({
  // You can customize configuration here or use environment variables
  customGreeting: "Thank you for calling Skedy AI! How can I assist you today?",

  // Optional event handlers
  onCallAccepted: (callId) => {
    console.log(`🎉 Call ${callId} accepted successfully`);
  },

  onWebSocketConnected: (callId) => {
    console.log(`🌐 WebSocket connected for call ${callId}`);
  },

  onError: (error, callId) => {
    console.error(`💥 Error handling call ${callId}:`, error.message);
  }
});

export async function POST(req: NextRequest) {
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
  if (!webhookHandler.verifyWebhookSignature(rawBody, signatureHeader, timestamp, webhookId)) {
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

    // Handle the call asynchronously
    await webhookHandler.handleIncomingCall(event);

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
