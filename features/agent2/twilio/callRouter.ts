// services/callEventHandler.ts
import { Session } from '../sessions/session';
import { WebhookEvent } from '@/app/api/voice/twilio-webhook/route';
import { acceptCall, persistSessionAndInteractions } from './callHandlers';
import { createAndConnectWebSocket } from '../real-time-open-ai/eventHandlers/connectionHandlers';
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
        // Accept call with OpenAI
        await acceptCall(session);
        // Create WebSocket connection (with automatic API key assignment and handler attachment)
        await createAndConnectWebSocket(session);
        break;

      case 'realtime.call.ended':
        // Persist session and interactions to database
        await persistSessionAndInteractions(session);
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
    // Track call event handling error
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'call_router_handle_event',
      metadata: {
        eventType: event.type,
        sessionStatus: session.status,
        errorName: (error as Error).name,
        hasBusinessEntity: !!session.businessEntity
      }
    });

    throw error; // Re-throw so caller can handle
  }
}
