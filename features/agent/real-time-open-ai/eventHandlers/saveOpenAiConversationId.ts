import { Session } from "../../sessions/session";
import { sentry } from "@/features/shared/utils/sentryService";

export interface SessionCreatedMessage {
  type: "session.created";
  session: {
    conversation_id: string;
  };
}

export async function saveOpenAiConversationId(
  session: Session,
  event: SessionCreatedMessage
): Promise<void> {
  try {
    const { conversation_id } = event.session;

    // Store the OpenAI conversation ID in our session
    session.openAiConversationId = conversation_id;

    console.log(`🎯 [SessionCreated] Stored conversation ID: ${conversation_id} for session ${session.id}`);

    // Add breadcrumb for session creation
    sentry.addBreadcrumb(`OpenAI session created`, 'session-created', {
      sessionId: session.id,
      businessId: session.businessId,
      conversationId: conversation_id
    });

  } catch (error) {
    // Track error in saving conversation ID
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'save_openai_conversation_id',
      metadata: {
        eventType: event.type,
        hasConversationId: !!(event.session?.conversation_id)
      }
    });

    throw error; // Re-throw so caller can handle
  }
}
