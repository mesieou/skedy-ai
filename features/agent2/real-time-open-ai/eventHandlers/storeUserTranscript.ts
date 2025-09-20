import { Session } from "../../sessions/session";
import { sentry } from "@/features/shared/utils/sentryService";
import { ServerInputAudioTranscriptionCompletedEvent } from "../types/server/events/conversation/serverInputAudioTranscriptionCompletedTypes";

export async function storeUserTranscript(
  session: Session,
  event: ServerInputAudioTranscriptionCompletedEvent
): Promise<void> {
  try {
    const { transcript, item_id } = event;

    console.log(`👤 [User Transcript] User said: "${transcript}"`);

    // Add breadcrumb for user transcript
    sentry.addBreadcrumb(`User transcript received`, 'user-transcript', {
      sessionId: session.id,
      businessId: session.businessId,
      conversationId: session.openAiConversationId,
      itemId: item_id,
      transcriptLength: transcript.length
    });

    // Store user transcript as pending customer input for next AI response
    session.pendingCustomerInput = transcript;

    console.log(`📝 [User Transcript] Stored pending customer input: "${transcript.substring(0, 100)}..."`);
    console.log(`🎯 [User Transcript] Will be used in next NORMAL interaction for session ${session.id}`);

  } catch (error) {
    console.error(`❌ [User Transcript] Failed to store user transcript for session ${session.id}:`, error);

    // Track error in Sentry
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'store_user_transcript',
      metadata: {
        eventType: 'conversation.item.input_audio_transcription.completed',
        conversationId: session.openAiConversationId,
        itemId: event.item_id
      }
    });
  }
}
