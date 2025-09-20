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
        // Tools/configuration updated
        break;

      // Response Events
      case "response.done":
        // Response complete - handle final cleanup only
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
        // Function result processed by OpenAI
        break;

      // Error Events
      default:
        if (event.type.includes('error') || event.type.includes('failed')) {
          // Handle error events
        }
        break;
    }
  });
}
