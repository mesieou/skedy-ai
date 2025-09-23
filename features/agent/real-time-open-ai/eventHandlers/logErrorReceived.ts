import { Session } from "../../sessions/session";
import { sentry } from "@/features/shared/utils/sentryService";
import { ServerErrorEvent } from "../types/server/events/error/serverErrorTypes";
import { ServerInputAudioTranscriptionFailedEvent } from "../types/server/events/conversation/serverInputAudioTranscriptionFailedTypes";

export type ErrorEvent = ServerErrorEvent | ServerInputAudioTranscriptionFailedEvent | {
  type: string; // Generic error events
  error?: {
    type: string;
    code?: string;
    message: string;
    param?: string;
  };
  message?: string;
};

export async function logErrorReceived(
  session: Session,
  event: ErrorEvent
): Promise<void> {
  let errorMessage: string;
  let errorCode: string | undefined;
  let errorParam: string | undefined;

  // Handle specific OpenAI error types
  if (event.type === 'error' && 'error' in event && event.error) {
    // ServerErrorEvent
    const serverError = event as ServerErrorEvent;
    errorMessage = serverError.error.message;
    errorCode = serverError.error.code;
    errorParam = serverError.error.param;
  } else if (event.type === 'conversation.item.input_audio_transcription.failed') {
    // ServerInputAudioTranscriptionFailedEvent
    const transcriptionError = event as ServerInputAudioTranscriptionFailedEvent;
    errorMessage = transcriptionError.error.message;
    errorCode = transcriptionError.error.code;
    errorParam = transcriptionError.error.param;
  } else {
    // Generic error event
    const genericError = event as { error?: { message: string; code?: string; param?: string }; message?: string };
    const errorDetails = genericError.error || { message: genericError.message || 'Unknown error' };
    errorMessage = errorDetails.message;
    errorCode = errorDetails.code;
    errorParam = errorDetails.param;
  }

  console.error(`❌ [ErrorReceived] Session ${session.id} | Error: ${event.type} | ${errorMessage} | Code: ${errorCode || 'none'}`);

  // Track error in Sentry with detailed context
  sentry.trackError(new Error(`OpenAI ${event.type}: ${errorMessage}`), {
    sessionId: session.id,
    businessId: session.businessId,
    operation: 'openai_error_received',
    metadata: {
      eventType: event.type,
      conversationId: session.openAiConversationId,
      errorCode: errorCode,
      errorParam: errorParam
    }
  });
}
