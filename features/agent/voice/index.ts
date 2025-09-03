// OpenAI Realtime SIP Voice Handler Modules
export { WebhookHandler } from './webhook-handler';
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
