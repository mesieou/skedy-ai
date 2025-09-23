/**
 * Accept Call Handler - Step 6
 *
 * Accepts incoming call with OpenAI Realtime API
 * Based on the old agent's CallService but simplified
 */

import axios from "axios";
import { sentry } from "@/features/shared/utils/sentryService";
import { webSocketPool } from "../../sessions/websocketPool";
import type { Session } from "../../sessions/session";
import assert from "assert";

// Constants for OpenAI API
const OPENAI_CONFIG = {
  BASE_URL: "https://api.openai.com/v1/realtime/calls",
  MODEL: "gpt-realtime", // For SIP calls, use "gpt-realtime" not versioned model
  VOICE: "marin",
} as const;

// Static audio configuration for OpenAI Realtime (matching working agent1)
const AUDIO_CONFIG = {
  input: {
    format: "pcm16" as const,
    turn_detection: {
      type: "semantic_vad" as const,
      create_response: true,
      interrupt_response: true,
      eagerness: "auto" as const  // Changed from "medium" to "auto" like agent1
    },
    transcription: {
      model: "gpt-4o-transcribe",  // Changed from "whisper-1" to match agent1
      language: "en"
    },
    noise_reduction: {
      type: "near_field"  // Changed from "basic" to "near_field" like agent1
    }
  },
  output: {
    format: {
      type: "pcm16" as const,
      rate: 24000
    },
    voice: process.env.OPENAI_VOICE || OPENAI_CONFIG.VOICE
  }
} as const;

// Constant function to create call config (no tools - sent via session.update)
const createCallConfig = (instructions: string) => ({
  type: "realtime" as const,
  instructions,
  model: OPENAI_CONFIG.MODEL, // Always use "gpt-realtime" for SIP calls
  audio: {
    ...AUDIO_CONFIG,
    output: {
      ...AUDIO_CONFIG.output,
      voice: process.env.OPENAI_VOICE || OPENAI_CONFIG.VOICE
    }
  }
});

// Response interface (needed for return type)
interface CallAcceptResponse {
  success: boolean;
  status: number;
  data?: {
    call_id?: string;
    status?: string;
    message?: string;
  };
  error?: string;
}

/**
 * Accept call with OpenAI Realtime API
 */
export async function acceptCall(session: Session): Promise<CallAcceptResponse> {
   // Get API key by index from pool
  const apiKey = webSocketPool.getApiKeyByIndex(session.assignedApiKeyIndex);
  try {
    console.log(`📞 [AcceptCall] Accepting call for session: ${session.id}`);

    // Add breadcrumb for debugging
    sentry.addBreadcrumb(`Accepting call for session ${session.id}`, 'call-accept', {
      businessId: session.businessId,
      sessionId: session.id
    });

    // Validate required data with type narrowing
    assert(session.aiInstructions, 'AI instructions not generated - call addPromptToSession first');
    assert(apiKey, 'Session API key not assigned and OPENAI_API_KEY environment variable not set');

    // Create call configuration using constants (no tools - sent via session.update later)
    const callConfig = createCallConfig(
      session.aiInstructions
    );

    // Make API call to OpenAI
    const acceptUrl = `${OPENAI_CONFIG.BASE_URL}/${session.id}/accept`;

    console.log(`🔗 [AcceptCall] Accept URL: ${acceptUrl}`);
    console.log(`🔧 [AcceptCall] Config: Model=${callConfig.model}, Voice=${callConfig.audio.output.voice}`);

    const response = await axios.post(acceptUrl, callConfig, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      validateStatus: (status) => status < 500 // Don't throw for 4xx errors
    });


    console.log(`📞 [AcceptCall] Response data:`, JSON.stringify(response.data, null, 2));

    // Add success breadcrumb
    sentry.addBreadcrumb(`Call accepted successfully`, 'call-accept', {
      sessionId: session.id,
      status: response.status,
    });

    if (response.status >= 200 && response.status < 300) {
      console.log(`✅ [AcceptCall] Call accepted successfully: ${session.id}`);

      // Store OpenAI call ID for WebSocket connection
      if (response.data?.call_id) {
        session.openAiCallId = response.data.call_id;
        console.log(`🔗 [AcceptCall] Stored OpenAI call ID: ${session.openAiCallId}`);
      }

      return {
        success: true,
        status: response.status,
        data: response.data
      };
    } else {
      return {
        success: false,
        status: response.status,
        error: response.data?.message || `HTTP ${response.status}`,
        data: response.data
      };
    }

  } catch (error) {
    console.error(`❌ [AcceptCall] Failed to accept call for session ${session.id}:`, error);

    // Track error in Sentry
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'accept_call',
      metadata: {
        hasInstructions: !!session.aiInstructions,
        toolsCount: session.currentTools?.length || 0
      }
    });
    throw error;
  }
}
