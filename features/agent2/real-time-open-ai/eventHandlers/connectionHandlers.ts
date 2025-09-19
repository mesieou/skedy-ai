import { Session } from "../../sessions/session";
// Note: Sentry is globally initialized in app/layout.tsx
import { sentry } from "@/features/shared/utils/sentryService";

/**
 * Handle WebSocket connection established
 *
 * Responsibilities:
 * - Log connection success
 * - Initialize session tools (if available)
 * - Send initial session configuration to OpenAI
 * - Request first AI response
 */
export async function handleWebSocketOpen(session: Session): Promise<void> {
  try {
    console.log(`✅ [WebSocket] Connected to OpenAI Realtime API for session: ${session.id}`);

    // Add breadcrumb for debugging
    sentry.addBreadcrumb(`WebSocket connected for session ${session.id}`, 'websocket');

    // Update session status
    if (session.ws) {
      // TODO: Initialize session tools if available
      // TODO: Send initial session configuration to OpenAI
      // TODO: Request first AI response to start conversation

      console.log(`🎯 [WebSocket] Session ${session.id} ready for interaction`);
    }
  } catch (error) {
    console.error(`❌ [WebSocket] Failed to handle open event for session ${session.id}:`, error);

    // Track production error
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'websocket_open',
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
 * - Update session status
 * - Trigger cleanup callbacks
 */
export async function handleWebSocketClose(
  session: Session,
  code: number,
  reason: string
): Promise<void> {
  try {
    console.log(`🔌 [WebSocket] Connection closed for session ${session.id}: ${code} - ${reason || 'No reason provided'}`);

    // Add breadcrumb for debugging
    sentry.addBreadcrumb(`WebSocket closed for session ${session.id}`, 'websocket', { code, reason });

    // Clean up WebSocket reference
    session.ws = undefined;

    // Update session status to ended
    session.status = 'ended';
    session.endedAt = Date.now();

    // Calculate session duration
    if (session.startedAt) {
      session.durationInMinutes = Math.round((Date.now() - session.startedAt) / (1000 * 60));
    }

    // The session sync manager will automatically persist these changes to Redis
    console.log(`📊 [WebSocket] Session ${session.id} ended after ${session.durationInMinutes || 0} minutes`);

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
