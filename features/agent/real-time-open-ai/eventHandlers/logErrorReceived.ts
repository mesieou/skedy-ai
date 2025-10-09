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

  // Enhanced logging for specific OpenAI API error codes
  if (errorCode) {
    switch (errorCode) {
      case '401':
        console.error(`🔐 [API Error] 401 Authentication Error - Check API key validity`);
        console.error(`🔐 [API Error] - Session business: ${session.businessEntity.name}`);
        console.error(`🔐 [API Error] - API key name: ${session.businessEntity.openai_api_key_name}`);
        break;
      case '403':
        console.error(`🚫 [API Error] 403 Forbidden - Country/region not supported or IP not authorized`);
        break;
      case '429':
        console.error(`⏰ [API Error] 429 Rate Limit - Too many requests or quota exceeded`);
        console.error(`⏰ [API Error] - Consider implementing backoff or checking billing`);
        break;
      case '500':
        console.error(`🔥 [API Error] 500 Server Error - Issue on OpenAI's servers`);
        console.error(`🔥 [API Error] - Retry after brief wait recommended`);
        break;
      case '503':
        console.error(`🚧 [API Error] 503 Service Unavailable - Servers overloaded or rate limiting`);
        console.error(`🚧 [API Error] - Reduce request rate and retry`);
        break;
      default:
        console.error(`❓ [API Error] Unknown error code: ${errorCode}`);
    }
  }

  // Track error in Sentry with detailed context
  sentry.trackError(new Error(`OpenAI ${event.type}: ${errorMessage}`), {
    sessionId: session.id,
    businessId: session.businessId,
    operation: 'openai_error_received',
    metadata: {
      eventType: event.type,
      conversationId: session.openAiConversationId,
      errorCode: errorCode,
      errorParam: errorParam,
      businessName: session.businessEntity.name,
      apiKeyName: session.businessEntity.openai_api_key_name
    }
  });
}
