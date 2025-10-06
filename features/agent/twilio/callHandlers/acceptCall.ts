/**
 * Accept Call Handler - Step 6
 *
 * Accepts incoming call with OpenAI Realtime API
 * Based on the old agent's CallService but simplified
 */

import axios from "axios";
import { sentry } from "@/features/shared/utils/sentryService";
// Dynamic import to avoid build-time evaluation
import type { Session } from "../../sessions/session";
import assert from "assert";
import { createWebSocketSessionConfig, OPENAI_REALTIME_CONFIG } from "@/features/shared/lib/openai-realtime-config";

// Use shared config - no more duplication!

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
   // Get API key for business
  const { BusinessWebSocketPool } = await import("../../sessions/websocketPool");
  const apiKey = BusinessWebSocketPool.getApiKeyByIndex(session.businessEntity, session.assignedApiKeyIndex);
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

    // Create call configuration using shared config (no tools - sent via session.update later)
    const callConfig = createWebSocketSessionConfig(session.aiInstructions);

    // Make API call to OpenAI
    const acceptUrl = `${OPENAI_REALTIME_CONFIG.BASE_URL}/${session.id}/accept`;

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
