// services/callEventHandler.ts
import { Session } from '../sessions/session';
import { WebhookEvent } from '@/app/api/voice/twilio-webhook/route';
import { acceptCall } from './callHandlers';
import { createAndConnectWebSocket, initiateWebSocketClose } from '../real-time-open-ai/eventHandlers/connectionHandlers';
import { sentry } from '@/features/shared/utils/sentryService';
import { addPromptToSession } from '../services/addPromptToSession';
import { getInitialRequestedTools } from '@/features/shared/lib/database/types/tools';
import { updateToolsToSession } from '../services/updateToolsToSession';

export async function handleCallEvent(session: Session, event: WebhookEvent) {
  try {
    switch(event.type) {
      case 'realtime.call.incoming':
        // Generate prompt with all loaded tools
        await addPromptToSession(session);
        // Add initial requested tools
        await updateToolsToSession(session, [...getInitialRequestedTools()]);
        // Accept call with OpenAI using session's assigned API key
        await acceptCall(session);
        // Create WebSocket connection using session's assigned API key
        await createAndConnectWebSocket(session);
        break;

      case 'realtime.call.ended':
        console.log(`🤖 [CallRouter] Realtime call ended: ${session.id}`);
        // Initiate graceful WebSocket closure to avoid 1006 errors
        await initiateWebSocketClose(session);
        // Persist session and interactions to database are handled in the connection handlers
        break;

      default:
        console.log('Unhandled event type:', event.type);

        // Track unhandled event type
        sentry.trackError(new Error(`Unhandled call event type: ${event.type}`), {
          sessionId: session.id,
          businessId: session.businessId,
          operation: 'call_router_unhandled_event',
          metadata: {
            eventType: event.type,
            sessionStatus: session.status,
            hasEventData: !!event.data
          }
        });
    }

  } catch (error) {
    console.error(`❌ [CallRouter] Error in handleCallEvent for session ${session.id}:`, error);

    // Release API key if session has one assigned
    if (typeof session.assignedApiKeyIndex === 'number') {
      const { BusinessWebSocketPool } = await import('../sessions/websocketPool');
      BusinessWebSocketPool.release(session.businessEntity, session.assignedApiKeyIndex);
      console.log(`🔄 [CallRouter] Released API key ${session.assignedApiKeyIndex + 1} due to call handling failure`);
    }

    // Track call event handling error
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'call_router_handle_event',
      metadata: {
        eventType: event.type,
        sessionStatus: session.status,
        errorName: (error as Error).name,
        hasBusinessEntity: !!session.businessEntity,
        apiKeyReleased: typeof session.assignedApiKeyIndex === 'number'
      }
    });

    throw error; // Re-throw so caller can handle
  }
}
