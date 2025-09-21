/**
 * Accept Call Handler - Step 6
 *
 * Accepts incoming call with OpenAI Realtime API
 * Based on the old agent's CallService but simplified
 */

import axios from "axios";
import { sentry } from "@/features/shared/utils/sentryService";
import type { Session } from "../../sessions/session";
import type { Tool } from "@/features/shared/lib/database/types/tools";
import assert from "assert";

// Constants for OpenAI API
const OPENAI_CONFIG = {
  BASE_URL: "https://api.openai.com/v1/realtime/calls",
  MODEL: "gpt-realtime-2025-08-28",
  VOICE: "marin",
  TIMEOUT: 10000,
} as const;

// Static audio configuration for OpenAI Realtime
const AUDIO_CONFIG = {
  input: {
    format: "pcm16" as const,
    turn_detection: {
      type: "semantic_vad" as const,
      create_response: true,
      interrupt_response: true,
      eagerness: "medium" as const
    },
    transcription: {
      model: "whisper-1",
      language: "en"
    },
    noise_reduction: {
      type: "basic"
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

// Constant function to create call config
const createCallConfig = (instructions: string, tools?: Tool[]) => ({
  type: "realtime" as const,
  instructions,
  model: process.env.OPENAI_REALTIME_MODEL || OPENAI_CONFIG.MODEL,
  audio: {
    ...AUDIO_CONFIG,
    output: {
      ...AUDIO_CONFIG.output,
      voice: process.env.OPENAI_VOICE || OPENAI_CONFIG.VOICE
    }
  },
  ...(tools && tools.length > 0 && {
    tools: tools.map(tool => ({
      type: "function" as const,
      function: {
        name: tool.function_schema.function.name,
        description: tool.function_schema.function.description,
        strict: tool.function_schema.function.strict,
        parameters: tool.function_schema.function.parameters
      }
    }))
  })
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
  const startTime = Date.now();

  try {
    console.log(`📞 [AcceptCall] Accepting call for session: ${session.id}`);

    // Add breadcrumb for debugging
    sentry.addBreadcrumb(`Accepting call for session ${session.id}`, 'call-accept', {
      businessId: session.businessId,
      sessionId: session.id
    });

    // Validate required data with type narrowing
    assert(session.aiInstructions, 'AI instructions not generated - call generatePromptAndTools first');
    assert(process.env.OPENAI_API_KEY, 'OPENAI_API_KEY environment variable not set');

    // Create call configuration using constants
    const callConfig = createCallConfig(
      session.aiInstructions,
      session.availableToolsForStage
    );

    // Make API call to OpenAI
    const acceptUrl = `${OPENAI_CONFIG.BASE_URL}/${session.id}/accept`;

    console.log(`🔗 [AcceptCall] Accept URL: ${acceptUrl}`);
    console.log(`🔧 [AcceptCall] Config: Model=${callConfig.model}, Voice=${callConfig.audio.output.voice}, Tools=${callConfig.tools?.length || 0}`);

    const response = await axios.post(acceptUrl, callConfig, {
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      validateStatus: (status) => status < 500, // Don't throw for 4xx errors
      timeout: OPENAI_CONFIG.TIMEOUT,
    });

    const duration = Date.now() - startTime;

    console.log(`📞 [AcceptCall] Response status: ${response.status} (${duration}ms)`);
    console.log(`📞 [AcceptCall] Response data:`, JSON.stringify(response.data, null, 2));

    // Add success breadcrumb
    sentry.addBreadcrumb(`Call accepted successfully`, 'call-accept', {
      sessionId: session.id,
      status: response.status,
      duration
    });

    if (response.status >= 200 && response.status < 300) {
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
    const duration = Date.now() - startTime;
    console.error(`❌ [AcceptCall] Failed to accept call for session ${session.id}:`, error);

    // Track error in Sentry
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'accept_call',
      metadata: {
        duration,
        hasInstructions: !!session.aiInstructions,
        toolsCount: session.availableToolsForStage?.length || 0
      }
    });

    return {
      success: false,
      status: 0,
      error: (error as Error).message
    };
  }
}
