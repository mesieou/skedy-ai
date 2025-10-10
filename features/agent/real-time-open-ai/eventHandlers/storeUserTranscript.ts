import { Session } from "../../sessions/session";
import { sentry } from "@/features/shared/utils/sentryService";
import { ServerInputAudioTranscriptionCompletedEvent } from "../types/server/events/conversation/serverInputAudioTranscriptionCompletedTypes";
import { ServerInputAudioTranscriptionDeltaEvent } from "../types/server/events/conversation/serverInputAudioTranscriptionDeltaTypes";

// Union type for both delta and completed events
type TranscriptionEvent = ServerInputAudioTranscriptionCompletedEvent | ServerInputAudioTranscriptionDeltaEvent;

export async function storeUserTranscript(
  session: Session,
  event: TranscriptionEvent
): Promise<void> {
  // Extract event type and item_id outside try block for error handling
  const { item_id } = event;
  const eventType = 'transcript' in event ? 'completed' : 'delta';

  try {
    // Extract transcript from either delta or completed event
    const transcript = 'transcript' in event ? event.transcript : event.delta;

    console.log(`👤 [User Transcript] User said: "${transcript}" (from ${eventType} event)`);

    // Add breadcrumb for user transcript
    sentry.addBreadcrumb(`User transcript received (${eventType})`, 'user-transcript', {
      sessionId: session.id,
      businessId: session.businessId,
      conversationId: session.openAiConversationId,
      itemId: item_id,
      transcriptLength: transcript.length,
      eventType: eventType
    });

    // Store user transcript as pending customer input for next AI response
    // Whisper-1 provides complete transcripts in delta events, no accumulation needed
    session.pendingCustomerInput = transcript.trim();

    console.log(`📝 [User Transcript] Stored pending customer input: "${transcript.substring(0, 100)}..."`);
    console.log(`📝 [User Transcript] Transcript length: ${transcript.length} characters`);

    console.log(`🎯 [User Transcript] Will be used in next NORMAL interaction for session ${session.id}`);

  } catch (error) {
    console.error(`❌ [User Transcript] Failed to store user transcript for session ${session.id}:`, error);

    // Track error in Sentry
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'store_user_transcript',
      metadata: {
        eventType: `conversation.item.input_audio_transcription.${eventType}`,
        conversationId: session.openAiConversationId,
        itemId: event.item_id
      }
    });
  }
}
