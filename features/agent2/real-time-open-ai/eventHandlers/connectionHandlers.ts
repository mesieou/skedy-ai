import { Session } from "../../sessions/session";
import { sentry } from "@/features/shared/utils/sentryService";
import { webSocketPool } from "../../sessions/websocketPool";
import { attachWSHandlers } from "../coordinateWsEvents";
import { updateOpenAiSession } from "./updateOpenAiSession";
import { requestInitialResponse } from "./requestInitialResponse";
import WebSocket from "ws";
import assert from "assert";

// Remove extended type - use session.assignedApiKeyIndex consistently

// Constants for WebSocket connection
const WEBSOCKET_CONFIG = {
  BASE_URL: "wss://api.openai.com/v1/realtime",
  TIMEOUT: 10000,
} as const;

/**
 * Create and connect WebSocket to OpenAI Realtime API using API key pool
 */
export async function createAndConnectWebSocket(session: Session): Promise<WebSocket> {
  const startTime = Date.now();
  const apiKey = webSocketPool.getApiKeyByIndex(session.assignedApiKeyIndex);

  try {
    console.log(`🌐 [ConnectionHandlers] Creating WebSocket connection for session: ${session.id}`);

    // Add breadcrumb for debugging
    sentry.addBreadcrumb(`Creating WebSocket connection for session ${session.id}`, 'websocket-create', {
      businessId: session.businessId,
      sessionId: session.id
    });

    // Validate API key
    assert(apiKey, 'No API key available from pool');

    // Create WebSocket connection using constants
    const wsUrl = `${WEBSOCKET_CONFIG.BASE_URL}?call_id=${session.id}`;
    console.log(`🔗 [ConnectionHandlers] WebSocket URL: ${wsUrl}`);

    const ws = new WebSocket(wsUrl, {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });

    // Attach the WebSocket to the session
    session.ws = ws;

    // Attach event handlers automatically
    attachWSHandlers(session);

    console.log(`🎯 [ConnectionHandlers] WebSocket created and handlers attached`);

    return ws;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [ConnectionHandlers] Failed to create WebSocket for session ${session.id}:`, error);

    // Track error in Sentry
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'create_websocket',
      metadata: {
        duration,
        wsUrl: `${WEBSOCKET_CONFIG.BASE_URL}?call_id=${session.id}`,
      }
    });

    throw error; // Re-throw so caller can handle
  }
}

/**
 * Handle WebSocket connection established (ongoing event)
 *
 * Responsibilities:
 * - Log connection success
 * - Initialize session tools (if available)
 * - Send initial session configuration to OpenAI
 * - Request first AI response
 */
export async function handleWebSocketOpen(session: Session): Promise<void> {
  try {
    console.log(`✅ [ConnectionHandlers] WebSocket open event for session: ${session.id}`);

    // Add breadcrumb for debugging
    sentry.addBreadcrumb(`WebSocket open event for session ${session.id}`, 'websocket-open');

    // Send initial session configuration to OpenAI (tools configured at session level)
    if (session.ws && session.currentTools && session.currentTools.length > 0) {
      console.log(`🔧 [ConnectionHandlers] Sending initial tools to OpenAI for session ${session.id}`);
      await updateOpenAiSession(session);
      console.log(`🎯 [ConnectionHandlers] Session ${session.id} ready for interaction`);

      // Request initial AI response to start the conversation
      await requestInitialResponse(session);
    }
  } catch (error) {
    console.error(`❌ [ConnectionHandlers] Failed to handle open event for session ${session.id}:`, error);

    // Track production error
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'websocket_open_event',
      metadata: { eventType: 'websocket_open' }
    });
  }
}

/**
 * Handle WebSocket connection closed
 *
 * Responsibilities:
 * - Log disconnection details
 * - Clean up WebSocket reference
 * - Release API key back to pool
 * - Update session status
 */
export async function handleWebSocketClose(
  session: Session,
  code: number,
  reason: string
): Promise<void> {
  try {
    console.log(`🔌 [ConnectionHandlers] Connection closed for session ${session.id}: ${code} - ${reason || 'No reason provided'}`);

    // Add breadcrumb for debugging
    sentry.addBreadcrumb(`WebSocket closed for session ${session.id}`, 'websocket-close', { code, reason });

    // Clean up WebSocket reference
    session.ws = undefined;
    // Release API key back to pool
    const apiKeyIndex = session.assignedApiKeyIndex;
    if (typeof apiKeyIndex === 'number') {
      webSocketPool.release(apiKeyIndex);
      console.log(`🔄 [ConnectionHandlers] Released API key ${apiKeyIndex + 1} back to pool`);
    }

    // Update session status to ended
    session.status = 'ended';
    session.endedAt = Date.now();

    // Calculate session duration
    if (session.startedAt) {
      session.durationInMinutes = Math.round((Date.now() - session.startedAt) / (1000 * 60));
    }

    // The session sync manager will automatically persist these changes to Redis
    console.log(`📊 [ConnectionHandlers] Session ${session.id} ended after ${session.durationInMinutes || 0} minutes`);

  } catch (error) {
    console.error(`❌ [WebSocket] Failed to handle close event for session ${session.id}:`, error);

    // Track production error
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'websocket_close',
      metadata: { closeCode: code, closeReason: reason }
    });
  }
}

/**
 * Handle WebSocket connection error
 *
 * Responsibilities:
 * - Log error details
 * - Track error in production monitoring
 * - Graceful degradation
 */
export async function handleWebSocketError(session: Session, error: Error): Promise<void> {
  try {
    console.error(`❌ [WebSocket] Connection error for session ${session.id}:`, error.message);

    // Track the WebSocket error in production monitoring
    sentry.trackError(error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'websocket_error',
      metadata: {
        errorName: error.name,
        errorMessage: error.message,
        sessionStatus: session.status,
      }
    });

    // Log error but don't change session status - let close handler manage state
    console.log(`📊 [WebSocket] Error in session ${session.id}, close handler will manage status`);

  } catch (handlingError) {
    console.error(`❌ [WebSocket] Failed to handle error event for session ${session.id}:`, handlingError);

    // Track the handler error as well
    sentry.trackError(handlingError as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'websocket_error_handler',
      metadata: { originalError: error.message }
    });
  }
}
