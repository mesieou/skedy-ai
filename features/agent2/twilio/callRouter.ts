// services/callEventHandler.ts
import { Session } from '../sessions/session';
import { WebhookEvent } from '@/app/api/voice/twilio-webhook/route';
import { generatePromptAndTools } from '../services/generatePromptAndTools';
import { acceptCall, persistSessionAndInteractions } from './callHandlers';
import { createAndConnectWebSocket } from '../real-time-open-ai/eventHandlers/connectionHandlers';
import { sentry } from '@/features/shared/utils/sentryService';

export async function handleCallEvent(session: Session, event: WebhookEvent) {
  try {
    switch(event.type) {
      case 'realtime.call.incoming':
        // Generate prompt and tools
        await generatePromptAndTools(session);
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
