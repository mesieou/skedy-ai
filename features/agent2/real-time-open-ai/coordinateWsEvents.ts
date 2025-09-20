import { Session } from "../sessions/session";
import {
  handleWebSocketOpen,
  handleWebSocketClose,
  handleWebSocketError
} from "./eventHandlers/connectionHandlers";

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
        // Session established with OpenAI
        break;

      case "session.updated":
        // Tools/configuration updated
        break;

      // Response Events
      case "response.done":
        // Response complete (contains function calls + token usage)
        break;

      case "response.function_call_arguments.done":
        // Function call arguments ready
        break;

      // Conversation Events
      case "conversation.item.input_audio_transcription.completed":
        // User speech transcribed
        break;

      case "response.output_audio_transcript.done":
        // AI speech transcribed
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
