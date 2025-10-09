import { Session } from "../../sessions/session";
import { sentry } from "@/features/shared/utils/sentryService";
// Dynamic import to avoid build-time evaluation
import { attachWSHandlers } from "../coordinateWsEvents";
import { updateOpenAiSession } from "./updateOpenAiSession";
import { requestInitialResponse } from "./requestInitialResponse";
import { persistSessionAndInteractions } from "./persistSessionAndInteractions";
import { redisSessionManager } from "../../sessions/redisClient";
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
  const { BusinessWebSocketPool } = await import("../../sessions/websocketPool");
  const apiKey = BusinessWebSocketPool.getApiKeyByIndex(session.businessEntity, session.assignedApiKeyIndex);

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
 * Check if WebSocket closure was abnormal and should trigger reconnection
 */
function shouldAttemptReconnection(code: number, session: Session): boolean {
  // Don't reconnect if session is already ended or if it was a normal closure
  if (session.status === 'ended' || code === 1000) {
    return false;
  }

  // Reconnect for abnormal closures
  const abnormalCodes = [1006, 1001, 1002, 1003, 1011]; // No close frame, going away, protocol error, etc.
  return abnormalCodes.includes(code);
}

/**
 * Clean up session resources (DRY helper for both normal close and failed reconnection)
 */
async function cleanupSessionResources(session: Session): Promise<void> {
  // Clean up WebSocket reference
  session.ws = undefined;

  // Release API key back to pool
  const apiKeyIndex = session.assignedApiKeyIndex;
  if (typeof apiKeyIndex === 'number') {
    const { BusinessWebSocketPool } = await import("../../sessions/websocketPool");
    BusinessWebSocketPool.release(session.businessEntity, apiKeyIndex);
    console.log(`🔄 [ConnectionHandlers] Released API key ${apiKeyIndex + 1} back to pool`);
  }

  // Update session status to ended
  session.status = 'ended';
  session.endedAt = Date.now();

  // Calculate session duration
  if (session.startedAt) {
    session.durationInMinutes = Math.round((session.endedAt - session.startedAt) / (1000 * 60));
  }

  // Persist session and interactions to database
  try {
    console.log(`💾 [ConnectionHandlers] Persisting session data to database...`);
    await persistSessionAndInteractions(session);
    console.log(`✅ [ConnectionHandlers] Session data persisted successfully`);
  } catch (persistError) {
    console.error(`❌ [ConnectionHandlers] Failed to persist session data:`, persistError);
    sentry.trackError(persistError as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'session_cleanup_persistence'
    });
  }

  // Clean up Redis session data
  try {
    console.log(`🧹 [ConnectionHandlers] Cleaning up Redis session data...`);
    await redisSessionManager.deleteSession(session.id, session.businessId);
    console.log(`✅ [ConnectionHandlers] Redis session data cleaned up successfully`);
  } catch (redisCleanupError) {
    console.error(`❌ [ConnectionHandlers] Failed to cleanup Redis session data:`, redisCleanupError);
    sentry.trackError(redisCleanupError as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'session_cleanup_redis'
    });
  }

  console.log(`📊 [ConnectionHandlers] Session ${session.id} ended after ${session.durationInMinutes || 0} minutes`);
}

/**
 * Attempt to reconnect WebSocket with exponential backoff
 */
async function attemptReconnection(session: Session, attempt: number = 1): Promise<void> {
  const maxAttempts = 3;
  const baseDelay = 1000; // 1 second

  if (attempt > maxAttempts) {
    console.log(`❌ [ConnectionHandlers] Max reconnection attempts (${maxAttempts}) reached for session: ${session.id}`);
    // Clean up resources after failed reconnection
    await cleanupSessionResources(session);
    return;
  }

  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 10000); // Cap at 10 seconds
  console.log(`🔄 [ConnectionHandlers] Attempting reconnection ${attempt}/${maxAttempts} for session: ${session.id} in ${delay}ms`);

  setTimeout(async () => {
    try {
      // Only reconnect if session is still active
      if (session.status === 'ended') {
        console.log(`🛑 [ConnectionHandlers] Session ${session.id} ended, skipping reconnection`);
        return;
      }

      console.log(`🔄 [ConnectionHandlers] Reconnecting WebSocket for session: ${session.id}`);
      await createAndConnectWebSocket(session);

      sentry.addBreadcrumb(`WebSocket reconnection successful`, 'websocket-reconnect', {
        sessionId: session.id,
        attempt: attempt,
        businessId: session.businessId
      });

    } catch (error) {
      console.error(`❌ [ConnectionHandlers] Reconnection attempt ${attempt} failed for session ${session.id}:`, error);

      sentry.trackError(error as Error, {
        sessionId: session.id,
        businessId: session.businessId,
        operation: 'websocket_reconnection',
        metadata: {
          attempt: attempt,
          maxAttempts: maxAttempts,
          errorName: (error as Error).name
        }
      });

      // Try again with next attempt
      await attemptReconnection(session, attempt + 1);
    }
  }, delay);
}

/**
 * Handle abnormal WebSocket closure - routes to normal cleanup or abnormal reconnection
 * This is the main event handler that responds when WebSocket closes for any reason
 */
export async function handleAbnormalWebSocketClosure(
  session: Session,
  code: number,
  reason: string
): Promise<void> {
  try {
    console.log(`🔌 [ConnectionHandlers] Connection closed for session ${session.id}: ${code} - ${reason || 'No reason provided'}`);

    // Add breadcrumb for debugging
    sentry.addBreadcrumb(`WebSocket closed for session ${session.id}`, 'websocket-close', { code, reason });

    // Check if we should attempt reconnection before cleanup
    if (shouldAttemptReconnection(code, session)) {
      console.log(`🔄 [ConnectionHandlers] Abnormal closure detected (${code}), attempting reconnection for session: ${session.id}`);
      await attemptReconnection(session);
    } else {
      console.log(`✅ [ConnectionHandlers] Normal closure for session ${session.id}: ${code} - ${reason}`);
      await cleanupSessionResources(session);
    }

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
 * Initiate graceful WebSocket closure ACTION
 * Call this to proactively close WebSocket with code 1000 when call ends normally
 * This ensures a clean closure instead of abnormal 1006
 */
export async function initiateWebSocketClose(session: Session): Promise<void> {
  try {
    if (session.ws && session.ws.readyState === session.ws.OPEN) {
      console.log(`🔌 [ConnectionHandlers] Gracefully closing WebSocket for session: ${session.id}`);

      // Close with normal closure code (1000)
      session.ws.close(1000, 'Call ended normally');

      // Add breadcrumb for graceful closure
      sentry.addBreadcrumb(`WebSocket gracefully closed for session ${session.id}`, 'websocket-graceful-close', {
        sessionId: session.id,
        businessId: session.businessId
      });
    } else {
      console.log(`🔌 [ConnectionHandlers] WebSocket already closed or not open for session: ${session.id}`);
    }
  } catch (error) {
    console.error(`❌ [ConnectionHandlers] Error closing WebSocket gracefully for session ${session.id}:`, error);

    // Track error but don't throw - connection cleanup will still happen
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'websocket_graceful_close',
      metadata: {
        wsReadyState: session.ws?.readyState,
        errorName: (error as Error).name
      }
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

/**
 * Handle WebRTC data channel open event
 * Similar to WebSocket open but uses data channel for communication
 * Instructions are already set via ephemeral token, only tools need to be sent
 */
export async function handleWebRTCOpen(session: Session, dataChannel: RTCDataChannel): Promise<void> {
  try {
    console.log(`✅ [ConnectionHandlers] WebRTC data channel open for session: ${session.id}`);

    // Add breadcrumb for debugging
    sentry.addBreadcrumb(`WebRTC data channel open for session ${session.id}`, 'webrtc-open');

    // WebRTC session configuration will be sent after session.created event
    console.log(`🎯 [ConnectionHandlers] WebRTC data channel ready - waiting for session.created event`);
  } catch (error) {
    console.error(`❌ [ConnectionHandlers] Failed to handle WebRTC open event for session ${session.id}:`, error);

    // Track production error
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'webrtc_open_event',
      metadata: {
        hasDataChannel: !!dataChannel,
        toolsCount: session.currentTools?.length || 0
      }
    });

    throw error;
  }
}
