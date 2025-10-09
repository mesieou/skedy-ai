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
    // Log OpenAI response headers for debugging
    console.log(`📊 [AcceptCall] OpenAI Response Headers:`);
    console.log(`📊 [AcceptCall] - x-request-id: ${response.headers?.['x-request-id'] || 'not provided'}`);
    console.log(`📊 [AcceptCall] - openai-organization: ${response.headers?.['openai-organization'] || 'not provided'}`);
    console.log(`📊 [AcceptCall] - openai-processing-ms: ${response.headers?.['openai-processing-ms'] || 'not provided'}`);
    console.log(`📊 [AcceptCall] - openai-version: ${response.headers?.['openai-version'] || 'not provided'}`);
    console.log(`📊 [AcceptCall] - x-ratelimit-remaining-requests: ${response.headers?.['x-ratelimit-remaining-requests'] || 'not provided'}`);
    console.log(`📊 [AcceptCall] - x-ratelimit-remaining-tokens: ${response.headers?.['x-ratelimit-remaining-tokens'] || 'not provided'}`);

    sentry.addBreadcrumb(`Call accepted successfully`, 'call-accept', {
      sessionId: session.id,
      status: response.status,
      requestId: response.headers?.['x-request-id'],
      processingMs: response.headers?.['openai-processing-ms'],
      remainingRequests: response.headers?.['x-ratelimit-remaining-requests'],
      remainingTokens: response.headers?.['x-ratelimit-remaining-tokens']
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
      // Enhanced logging for HTTP error responses
      console.error(`❌ [AcceptCall] HTTP ${response.status} error for session ${session.id}`);

      switch (response.status) {
        case 401:
          console.error(`🔐 [AcceptCall] 401 Authentication Error - Invalid API key`);
          console.error(`🔐 [AcceptCall] - Business: ${session.businessEntity.name}`);
          console.error(`🔐 [AcceptCall] - API key name: ${session.businessEntity.openai_api_key_name}`);
          break;
        case 403:
          console.error(`🚫 [AcceptCall] 403 Forbidden - Country/region not supported or IP not authorized`);
          break;
        case 429:
          console.error(`⏰ [AcceptCall] 429 Rate Limit - Too many requests or quota exceeded`);
          break;
        case 500:
          console.error(`🔥 [AcceptCall] 500 Server Error - Issue on OpenAI's servers`);
          break;
        case 503:
          console.error(`🚧 [AcceptCall] 503 Service Unavailable - Servers overloaded`);
          break;
      }

      console.error(`❌ [AcceptCall] Response data:`, response.data);

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
