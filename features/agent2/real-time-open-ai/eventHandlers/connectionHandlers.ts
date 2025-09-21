import { Session } from "../../sessions/session";
import { sentry } from "@/features/shared/utils/sentryService";
import { webSocketPool } from "../../sessions/websocketPool";
import { attachWSHandlers } from "../coordinateWsEvents";
import WebSocket from "ws";
import assert from "assert";

// Extend session type for API key tracking
type SessionWithApiKey = Session & { apiKeyIndex?: number };

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
  let poolAssignment: { apiKey: string; index: number } | null = null;

  try {
    console.log(`🌐 [ConnectionHandlers] Creating WebSocket connection for session: ${session.id}`);

    // Add breadcrumb for debugging
    sentry.addBreadcrumb(`Creating WebSocket connection for session ${session.id}`, 'websocket-create', {
      businessId: session.businessId,
      sessionId: session.id
    });

    // Get API key from pool for load balancing
    poolAssignment = webSocketPool.assign();
    const { apiKey, index } = poolAssignment;

    console.log(`🔑 [ConnectionHandlers] Assigned API key ${index + 1} for session: ${session.id}`);

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

    // Set timeout for connection
    const connectionTimeout = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.terminate();
        throw new Error('WebSocket connection timeout');
      }
    }, WEBSOCKET_CONFIG.TIMEOUT);

    // Wait for connection to open
    await new Promise<void>((resolve, reject) => {
      ws.once('open', () => {
        clearTimeout(connectionTimeout);
        const duration = Date.now() - startTime;

        console.log(`✅ [ConnectionHandlers] WebSocket connected successfully (${duration}ms)`);

        // Add success breadcrumb
        sentry.addBreadcrumb(`WebSocket connected successfully`, 'websocket-create', {
          sessionId: session.id,
          duration
        });

        resolve();
      });

      ws.once('error', (error) => {
        clearTimeout(connectionTimeout);
        reject(error);
      });

      ws.once('close', (code, reason) => {
        clearTimeout(connectionTimeout);
        if (ws.readyState === WebSocket.CONNECTING) {
          reject(new Error(`WebSocket closed during connection: ${code} - ${reason}`));
        }
      });
    });

    // Attach the WebSocket to the session
    session.ws = ws;

    // Store API key index for cleanup (add to session metadata)
    (session as SessionWithApiKey).apiKeyIndex = index;

    // Attach event handlers automatically
    attachWSHandlers(session);

    console.log(`🎯 [ConnectionHandlers] WebSocket created and handlers attached`);

    return ws;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [ConnectionHandlers] Failed to create WebSocket for session ${session.id}:`, error);

    // Release API key back to pool on error
    if (poolAssignment) {
      webSocketPool.release(poolAssignment.index);
      console.log(`🔄 [ConnectionHandlers] Released API key ${poolAssignment.index + 1} back to pool`);
    }

    // Track error in Sentry
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'create_websocket',
      metadata: {
        duration,
        wsUrl: `${WEBSOCKET_CONFIG.BASE_URL}?call_id=${session.id}`,
        apiKeyIndex: poolAssignment?.index
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

    // Update session status
    if (session.ws) {
      // TODO: Initialize session tools if available
      // TODO: Send initial session configuration to OpenAI
      // TODO: Request first AI response to start conversation

      console.log(`🎯 [ConnectionHandlers] Session ${session.id} ready for interaction`);
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
    const apiKeyIndex = (session as SessionWithApiKey).apiKeyIndex;
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

    // Update session status if needed
    if (session.status === 'active') {
      console.log(`📊 [WebSocket] Updating session ${session.id} status due to error`);
      // Don't end the session immediately - let the close handler do that
    }

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
