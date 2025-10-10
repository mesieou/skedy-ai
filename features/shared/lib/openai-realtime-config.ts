/**
 * Shared OpenAI Realtime API Configuration
 * Used by both backend (WebSocket/SIP) and demo (WebRTC) systems
 */

// OpenAI API constants
export const OPENAI_REALTIME_CONFIG = {
  BASE_URL: "https://api.openai.com/v1/realtime/calls",
  MODEL: "gpt-realtime", // Use gpt-realtime for both SIP and WebRTC
  VOICE: "marin",
} as const;

// Shared audio configuration for OpenAI Realtime
export const OPENAI_AUDIO_CONFIG = {
  input: {
    format: {
      type: "audio/pcm" as const,
      rate: 24000
    },
    turn_detection: {
      type: "semantic_vad" as const,
      create_response: true,
      interrupt_response: true,
      eagerness: "auto" as const
    },
    transcription: {
      model: "gpt-4o-transcribe",
      language: "en"
    },
    noise_reduction: {
      type: "near_field" as const
    }
  },
  output: {
    format: {
      type: "audio/pcm" as const,
      rate: 24000
    },
    voice: process.env.OPENAI_VOICE || OPENAI_REALTIME_CONFIG.VOICE
  }
} as const;

// Session configuration for WebRTC (demo)
export const createWebRTCSessionConfig = (tools: unknown[] = [], instructions?: string) => ({
  type: "realtime" as const,
  model: OPENAI_REALTIME_CONFIG.MODEL,
  output_modalities: ["audio"] as const,
  audio: OPENAI_AUDIO_CONFIG,
  tools: tools,
  tool_choice: "auto" as const,
  instructions: instructions || 'You are a helpful assistant.'
});

// Session configuration for WebSocket/SIP (backend)
export const createWebSocketSessionConfig = (instructions: string) => ({
  type: "realtime" as const,
  instructions,
  model: OPENAI_REALTIME_CONFIG.MODEL,
  audio: OPENAI_AUDIO_CONFIG
});

// Session update configuration (for tool updates)
export const createSessionUpdateConfig = (tools: unknown[], eventId?: string) => ({
  type: "session.update" as const,
  session: {
    type: "realtime" as const,
    tools: tools,
    tool_choice: "auto" as const
  },
  event_id: eventId || `event_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
});
