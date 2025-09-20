// services/callEventHandler.ts
import { Session } from '../sessions/session';
import { WebhookEvent } from '@/app/api/voice/twilio-webhook/route';
import { generatePromptAndTools } from '../services/generatePromptAndTools';
import { acceptCall, persistSessionAndInteractions } from './callHandlers';
import { createAndConnectWebSocket } from '../real-time-open-ai/eventHandlers/connectionHandlers';

export async function handleCallEvent(session: Session, event: WebhookEvent) {
  switch(event.type) {
    case 'realtime.call.incoming':
      // Generate prompt and tools
      await generatePromptAndTools(session.businessEntity!, session);
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
  }
}
