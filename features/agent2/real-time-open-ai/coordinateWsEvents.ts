import { Session } from "../sessions/session";
import {
  handleWebSocketOpen,
  handleWebSocketClose,
  handleWebSocketError
} from "./eventHandlers/connectionHandlers";
import { saveOpenAiConversationId, SessionCreatedMessage } from "./eventHandlers/saveOpenAiConversationId";
import { executeFunctionCall } from "./eventHandlers/executeFunctionCall";
import { storeAiTranscript } from "./eventHandlers/storeAiTranscript";
import { storeUserTranscript } from "./eventHandlers/storeUserTranscript";
import { logToolsUpdated, SessionUpdatedEvent } from "./eventHandlers/logToolsUpdated";
import { logFunctionProcessed, ConversationItemDoneEvent } from "./eventHandlers/logFunctionProcessed";
import { logErrorReceived, ErrorEvent } from "./eventHandlers/logErrorReceived";
import { requestResponseAfterFunction, ResponseDoneEvent } from "./eventHandlers/requestResponseAfterFunction";
import { logRateLimits } from "./eventHandlers/logRateLimits";
import { ServerRateLimitsUpdatedEvent } from "./types/server/events/rateLimints/serverRateLimitsUpdatedTypes";
import { ServerResponseFunctionCallArgumentsDoneEvent } from "./types/server/events/response/serverResponseFunctionCallArgumentsDoneTypes";
import { ServerResponseOutputAudioTranscriptDoneEvent } from "./types/server/events/response/serverResponseOutputAudioTranscriptDoneTypes";
import { ServerInputAudioTranscriptionCompletedEvent } from "./types/server/events/conversation/serverInputAudioTranscriptionCompletedTypes";

// Lean event router - just routes events to handlers
export function attachWSHandlers(session: Session) {
  if (!session.ws) {
    throw new Error('WebSocket not initialized in session');
  }

  // WebSocket Connection Events
  session.ws.on("open", async () => {
    await handleWebSocketOpen(session);
  });

  session.ws.on("close", async (code: number, reason: string) => {
    await handleWebSocketClose(session, code, reason);
  });

  session.ws.on("error", async (error: Error) => {
    await handleWebSocketError(session, error);
  });

  session.ws.on("message", async (raw) => {
    const event = JSON.parse(raw.toString());

    switch(event.type) {
      // Connection Events
      case "session.created":
        // Saved the OpenAI conversation ID in our session
        await saveOpenAiConversationId(session, event as SessionCreatedMessage);
        break;

      case "session.updated":
        // Tools/configuration updated - log confirmed tools
        await logToolsUpdated(session, event as SessionUpdatedEvent);
        break;

      // Response Events
      case "response.done":
        // Response complete - clear pending data and request next response if functions were called
        await requestResponseAfterFunction(session, event as ResponseDoneEvent);
        break;

      case "response.function_call_arguments.done":
        // Execute function immediately when arguments are ready (modern approach)
        await executeFunctionCall(session, event as ServerResponseFunctionCallArgumentsDoneEvent);
        break;

      // Conversation Events
      case "conversation.item.input_audio_transcription.completed":
        // Store user speech transcript
        await storeUserTranscript(session, event as ServerInputAudioTranscriptionCompletedEvent);
        break;

      case "response.output_audio_transcript.done":
        // Store AI speech transcript
        await storeAiTranscript(session, event as ServerResponseOutputAudioTranscriptDoneEvent);
        break;

      case "conversation.item.done":
        // Function result processed by OpenAI - log confirmation
        await logFunctionProcessed(session, event as ConversationItemDoneEvent);
        break;

      case "rate_limits.updated":
        // Rate limits updated - log current limits
        await logRateLimits(session, event as ServerRateLimitsUpdatedEvent);
        break;

      // Error Events
      default:
        if (event.type.includes('error') || event.type.includes('failed')) {
          // Handle error events with comprehensive logging
          await logErrorReceived(session, event as ErrorEvent);
        }
        break;
    }
  });
}
