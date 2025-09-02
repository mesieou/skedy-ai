# OpenAI Realtime SIP Integration

This document explains how the Twilio → OpenAI Realtime API integration works for voice calls.

## 🎯 Overview

This system enables phone callers to have real-time voice conversations with an AI assistant powered by OpenAI's Realtime API. The integration handles incoming calls through Twilio and routes them to OpenAI for AI-powered voice interactions.

## 🏗️ Architecture

```
Caller → Twilio Phone Number → OpenAI SIP Endpoint → OpenAI Webhook → Your Server → AI Processing
   ↑                                                                      ↓
   └── AI Audio Response ←── OpenAI Realtime API ←── WebSocket Connection ←┘
```

## 📞 Call Flow

### 1. **Incoming Call**
- Caller dials your Twilio phone number (`+61468002102`)
- Twilio receives the call and forwards it to OpenAI SIP endpoint
- **Twilio Configuration**: `sip:proj_0yNtGPSZls0YCePK96SJ9TC7@sip.api.openai.com`

### 2. **OpenAI SIP Processing**
- OpenAI receives the SIP call
- OpenAI sends a webhook to your server: `POST /api/voice/realtime-webhook`
- Webhook contains call details and `call_id`

### 3. **Your Server Processing**
- **Signature Verification**: Validates webhook authenticity using OpenAI SDK
- **Call Acceptance**: Makes REST API call to accept the call
- **WebSocket Connection**: Connects to OpenAI Realtime API for real-time communication
- **AI Initialization**: Sets up AI assistant with voice and instructions

### 4. **Real-time Conversation**
- Audio flows: `Caller ↔ Twilio ↔ OpenAI SIP ↔ OpenAI Realtime API ↔ AI Assistant`
- AI processes speech in real-time and responds with natural voice
- Conversation continues until caller hangs up

## 🔧 Technical Implementation

### **Webhook Handler** (`/api/voice/realtime-webhook/route.ts`)
```typescript
export async function POST(req: NextRequest) {
  // 1. Get webhook data
  const rawBody = await req.text();

  // 2. Verify signature using OpenAI SDK
  if (!webhookHandler.verifyWebhookSignature(rawBody, signatureHeader, timestamp, webhookId)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 3. Handle incoming call
  if (event.type === 'realtime.call.incoming') {
    await webhookHandler.handleIncomingCall(event);
    return NextResponse.json({ status: "accepted", call_id: event.data.call_id });
  }
}
```

### **Call Acceptance Flow**
```typescript
// 1. Accept call via REST API
await axios.post(
  `https://api.openai.com/v1/realtime/calls/${callId}/accept`,
  callAcceptConfig,
  { headers: authHeaders }
);

// 2. Connect WebSocket for real-time communication
const ws = new WebSocket(
  `wss://api.openai.com/v1/realtime?call_id=${callId}`,
  { headers: authHeaders }
);

// 3. Send initial greeting
ws.send(JSON.stringify(responseCreateConfig));
```

## 🔑 Required Configuration

### **Environment Variables**
```bash
OPENAI_API_KEY="sk-proj-..."                                    # OpenAI API key
OPENAI_WEBHOOK_SECRET="whsec_..."                              # OpenAI webhook secret
OPENAI_MODEL="gpt-4o-realtime-preview-2024-12-17"            # AI model (optional)
OPENAI_VOICE="alloy"                                          # AI voice (optional)
OPENAI_INSTRUCTIONS="You are a helpful assistant..."          # AI instructions (optional)
```

### **Twilio Configuration**
1. **Phone Number**: `+61468002102`
2. **Voice Configuration**:
   - **Configure with**: SIP URI
   - **A call comes in**: `sip:proj_0yNtGPSZls0YCePK96SJ9TC7@sip.api.openai.com`
3. **Webhook URL**: `https://your-ngrok-url.ngrok-free.app/api/voice/realtime-webhook`

### **OpenAI SIP Project Configuration**
1. **SIP Project ID**: `proj_0yNtGPSZls0YCePK96SJ9TC7`
2. **Webhook URL**: Your webhook endpoint
3. **Model**: `gpt-4o-realtime-preview-2024-12-17`
4. **Voice Settings**: Configured for phone calls

## 📁 Modular Architecture

The implementation is split into focused modules:

### **Configuration** (`config.ts`)
- Environment-driven configuration
- Default settings with overrides
- Type-safe interfaces

### **Signature Service** (`signature-service.ts`)
- Webhook signature verification using OpenAI SDK
- Security validation for incoming webhooks

### **Call Service** (`call-service.ts`)
- REST API call acceptance
- Error handling and fallback endpoints
- Detailed logging for debugging

### **WebSocket Service** (`websocket-service.ts`)
- Real-time communication with OpenAI
- Message parsing and logging
- Connection management

### **Webhook Handler** (`webhook-handler.ts`)
- Orchestrates the entire call flow
- Event-driven architecture
- Configurable callbacks

## 🔊 Audio Configuration

### **Audio Formats**
- **Input**: PCM16 (from phone calls)
- **Output**: PCM16 (to phone calls)
- **Voice**: Alloy (configurable)

### **Voice Activity Detection**
- **Type**: Server VAD
- **Threshold**: 0.5
- **Prefix Padding**: 300ms
- **Silence Duration**: 200ms

## 🐛 Debugging

### **Key Log Messages**
- `📥 Incoming webhook request` - Webhook received
- `✅ Signature verification passed` - Security check passed
- `📞 Attempting to accept call` - REST API call acceptance
- `✅ Call accepted successfully` - Call acceptance succeeded
- `🌐 Connecting to WebSocket` - Real-time connection
- `✅ [WebSocket] Connected successfully` - AI connection established
- `💬 [WebSocket] Audio transcript` - AI speech transcription
- `🔊 [WebSocket] Audio data being streamed` - Audio flowing to caller

### **Common Issues**

#### **Signature Verification Failed**
- Check `OPENAI_WEBHOOK_SECRET` in environment
- Ensure webhook secret includes `whsec_` prefix
- Verify webhook secret matches OpenAI project configuration

#### **404 on Call Accept**
- Check OpenAI API key permissions
- Verify call_id is valid and not expired
- Ensure OpenAI SIP project is active

#### **WebSocket Connection Failed**
- Verify `OPENAI_API_KEY` is set correctly
- Check if call_id parameter is included in WebSocket URL
- Ensure OpenAI Realtime API access is enabled

#### **No Audio on Calls**
- Verify SIP connectivity between Twilio and OpenAI
- Check OpenAI SIP project status
- Ensure proper audio format configuration (PCM16)

#### **SIP Timeout Errors (Twilio Error 32011)**
- Check OpenAI SIP endpoint availability
- Verify SIP URI is correct: `sip:proj_[PROJECT_ID]@sip.api.openai.com`
- Ensure OpenAI SIP project is active and configured

## 🔄 Event Types

### **Webhook Events**
- `realtime.call.incoming` - New call received
- Additional events can be handled as needed

### **WebSocket Events**
- `session.created` - AI session established
- `response.created` - AI response initiated
- `response.audio.delta` - Audio data streaming
- `response.audio_transcript.delta` - Speech transcription
- `response.done` - Response completed
- `error` - Error occurred

## 🚀 Deployment

### **Development**
```bash
npm run dev
ngrok http 3000
# Update Twilio webhook URL to ngrok URL
```

### **Production**
- Deploy to Vercel/Netlify/etc.
- Update Twilio webhook URL to production domain
- Ensure environment variables are set in deployment

## 🔐 Security

- **Webhook Signature Verification**: All webhooks are verified using OpenAI SDK
- **HTTPS Required**: All communication uses HTTPS/WSS
- **API Key Protection**: Environment variables for sensitive data
- **Error Handling**: Graceful failure without exposing internals

## 📊 Monitoring

### **Success Indicators**
- Webhook returns 200 status
- Call acceptance returns 200 status
- WebSocket connection established
- Audio transcript appears in logs

### **Error Monitoring**
- Failed signature verification (401 responses)
- Call acceptance failures (404/400 responses)
- WebSocket connection errors
- SIP connectivity timeouts

## 🎛️ Customization

### **AI Instructions**
Modify `OPENAI_INSTRUCTIONS` environment variable or update `config.ts`:
```typescript
instructions: "You are a helpful phone assistant for Skedy AI..."
```

### **Voice Settings**
Change AI voice by updating `OPENAI_VOICE` environment variable:
- `alloy` (default)
- `echo`
- `fable`
- `onyx`
- `nova`
- `shimmer`

### **Greeting Message**
Customize the initial greeting in `config.ts`:
```typescript
getResponseCreateConfig("Your custom greeting message")
```

## 🔗 Dependencies

- **OpenAI SDK**: Webhook verification and API communication
- **WebSocket (`ws`)**: Real-time communication
- **Axios**: HTTP requests for call acceptance
- **Next.js**: Web framework for webhook handling

## 📋 Environment Setup

### **Required Services**
1. **Twilio Account**: Phone number and SIP configuration
2. **OpenAI Account**: Realtime API access and SIP project
3. **Hosting**: Server to run webhook endpoint
4. **ngrok** (development): Tunnel for local testing

### **Configuration Steps**
1. Set up OpenAI SIP project
2. Configure Twilio phone number with SIP URI
3. Set webhook URL in OpenAI project
4. Configure environment variables
5. Deploy webhook endpoint

## 🎉 Success Criteria

When everything is working correctly:
- ✅ Callers can dial your Twilio number
- ✅ Calls connect to AI assistant within seconds
- ✅ AI responds with natural voice
- ✅ Real-time conversation flows naturally
- ✅ Calls end gracefully when caller hangs up
- ✅ All webhook and API calls return success status codes

---

*This integration provides a seamless voice AI experience for callers, combining Twilio's telephony infrastructure with OpenAI's advanced conversational AI capabilities.*
