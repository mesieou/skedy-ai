// ============================================================================
// CONSTANTS
// ============================================================================

export const OPENAI_DEFAULTS = {
  MODEL: "gpt-realtime-2025-08-28",
  VOICE: "marin",
} as const;

// ============================================================================
// OPENAI API TYPES
// ============================================================================
export interface CallAcceptConfig {
  type: "realtime";
  instructions: string;
  model: string;
  audio: {
    output: {
      voice: string;
    };
  };
}



export interface OpenAIWebSocketMessage {
  type: string;
  delta?: string;
  error?: {
    type?: string;
    code?: string;
    message?: string;
    param?: string;
    event_id?: string | null;
  };
  session?: {
    model?: string;
    voice?: string;
    instructions?: string;
    input_audio_format?: string;
    output_audio_format?: string;
    temperature?: number;
    max_response_output_tokens?: string | number;
  };
  response?: {
    model?: string;
    voice?: string;
    status?: string;
    conversation_id?: string;
    audio?: {
      output?: {
        voice?: string;
        format?: {
          type?: string;
          rate?: number;
        };
      };
    };
  };
}

// ============================================================================
// APPLICATION TYPES
// ============================================================================
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
  };
}

export interface WebhookHandlerOptions {
  config?: Partial<OpenAIRealtimeConfig>;
  customGreeting?: string;
  onCallAccepted?: (callId: string) => void;
  onWebSocketConnected?: (callId: string) => void;
  onError?: (error: Error, callId?: string) => void;
}

// ============================================================================
// CONFIGURATION
// ============================================================================
export interface OpenAIRealtimeConfig {
  apiKey: string;
  webhookSecret: string;
  model: string;
  voice: string;
}

// Default configuration
export const getOpenAIConfig = (): OpenAIRealtimeConfig => ({
  apiKey: process.env.OPENAI_API_KEY!,
  webhookSecret: process.env.OPENAI_WEBHOOK_SECRET!,
  model: process.env.OPENAI_MODEL || OPENAI_DEFAULTS.MODEL,
  voice: process.env.OPENAI_VOICE || OPENAI_DEFAULTS.VOICE,
});

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================
export const createCallAcceptConfig = (
  instructions: string,
  model: string,
  voice: string
): CallAcceptConfig => ({
  type: "realtime",
  instructions,
  model,
  audio: {
    output: {
      voice
    }
  }
});



export const getAuthHeaders = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
});
