import type { Session } from '../../sessions/session';
import { sentry } from '@/features/shared/utils/sentryService';
import assert from 'assert';

/**
 * Request initial AI response to start the conversation
 * Based on the old agent's requestOptimizedResponse pattern
 */
export async function requestInitialResponse(session: Session): Promise<void> {
  assert(session.ws, 'WebSocket not available in session');

  try {
    const responseEventId = `response_request_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const responseConfig = {
      type: "response.create",
      event_id: responseEventId,
      response: {
        conversation: "auto",
        output_modalities: ["audio"] as const
      }
    };

    console.log(`🎯 [RequestInitialResponse] Requesting initial AI response for session ${session.id}`);
    console.log(`📡 [RequestInitialResponse] Sending response.create with event_id: ${responseEventId}`);

    session.ws.send(JSON.stringify(responseConfig));
    console.log(`✅ [RequestInitialResponse] Initial response request sent, AI should start speaking...`);

    // Add breadcrumb for debugging
    sentry.addBreadcrumb(`Initial AI response requested`, 'initial-response', {
      sessionId: session.id,
      eventId: responseEventId
    });

  } catch (error) {
    console.error(`❌ [RequestInitialResponse] Failed to request initial response for session ${session.id}:`, error);

    // Track error in Sentry
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'request_initial_response',
      metadata: { hasWebSocket: !!session.ws }
    });

    throw error; // Re-throw so caller can handle
  }
}
