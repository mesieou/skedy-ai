// OpenAI Realtime SIP Voice Handler Modules - New Architecture Only

// Voice webhook handler (event-driven)
export { VoiceWebhookHandler } from './webhook-handler';
export { WebSocketCoordinator, type WebSocketCoordinatorOptions } from './websocket-coordinator';

// Core services (used by both architectures)
export { CallService, type CallAcceptResponse } from './call-service';
export { WebSocketService, type WebSocketConnectionOptions } from './websocket-service';
export { SignatureService, type SignatureVerificationResult } from './signature-service';

// Configuration & Types
export {
  getOpenAIConfig,
  getAuthHeaders,
  createCallAcceptConfig,

  type OpenAIRealtimeConfig,
  type WebhookEvent,
  type WebhookHandlerOptions,
  type CallAcceptConfig,

  type OpenAIWebSocketMessage,
  OPENAI_DEFAULTS
} from './config';
