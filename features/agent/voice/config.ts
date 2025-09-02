// OpenAI Realtime SIP Configuration
export interface OpenAIRealtimeConfig {
  apiKey: string;
  webhookSecret: string;
  model: string;
  voice: string;
  instructions: string;
  inputAudioFormat: string;
  outputAudioFormat: string;
  turnDetection: {
    type: string;
    threshold: number;
    prefixPaddingMs: number;
    silenceDurationMs: number;
  };
}

export interface CallAcceptConfig {
  type: string;
  instructions: string;
  model: string;
}

export interface ResponseCreateConfig {
  type: string;
  response: {
    instructions: string;
  };
}

// Default configuration
export const getOpenAIConfig = (): OpenAIRealtimeConfig => ({
  apiKey: process.env.OPENAI_API_KEY!,
  webhookSecret: process.env.OPENAI_WEBHOOK_SECRET!,
  model: process.env.OPENAI_MODEL || "gpt-4o-realtime-preview-2024-12-17",
  voice: process.env.OPENAI_VOICE || "marin",
  instructions: process.env.OPENAI_INSTRUCTIONS || "You are a helpful phone assistant for Skedy AI. Answer the caller's questions clearly and concisely. Keep responses brief since this is a phone call. Always be polite and professional.",
  inputAudioFormat: "pcm16",
  outputAudioFormat: "pcm16",
  turnDetection: {
    type: "server_vad",
    threshold: Number(process.env.OPENAI_VAD_THRESHOLD) || 0.5,
    prefixPaddingMs: Number(process.env.OPENAI_PREFIX_PADDING_MS) || 300,
    silenceDurationMs: Number(process.env.OPENAI_SILENCE_DURATION_MS) || 200,
  },
});

export const getCallAcceptConfig = (config: OpenAIRealtimeConfig): CallAcceptConfig => ({
  type: "realtime",
  instructions: config.instructions,
  model: config.model,
});

export const getResponseCreateConfig = (greetingMessage?: string): ResponseCreateConfig => ({
  type: "response.create",
  response: {
    instructions: greetingMessage || process.env.OPENAI_GREETING || "Say to the user 'Thank you for calling, how can I help you?'",
  },
});

export const getAuthHeaders = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
});
