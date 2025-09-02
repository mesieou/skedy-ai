import WebSocket from "ws";
import { ResponseCreateConfig, getAuthHeaders } from "./config";

export interface WebSocketConnectionOptions {
  callId: string;
  apiKey: string;
  responseConfig: ResponseCreateConfig;
  onMessage?: (message: string) => void;
  onError?: (error: Error) => void;
  onClose?: (code: number, reason: string) => void;
}

export class WebSocketService {
  private baseUrl = "wss://api.openai.com/v1/realtime";

  async connect(options: WebSocketConnectionOptions): Promise<WebSocket> {
    const { callId, apiKey, responseConfig, onMessage, onError, onClose } =
      options;

    console.log("🌐 Connecting to WebSocket for real-time communication...");

    const wsUrl = `${this.baseUrl}?call_id=${callId}`;
    console.log(`🔗 WebSocket URL: ${wsUrl}`);

    const ws = new WebSocket(wsUrl, {
      headers: getAuthHeaders(apiKey),
    });

    ws.on("open", () => {
      console.log("✅ [WebSocket] Connected successfully");
      console.log("📤 [WebSocket] Sending initial response...");

      ws.send(JSON.stringify(responseConfig));
    });

    ws.on("message", (data) => {
      const message = data.toString();
      console.log(
        "📥 [WebSocket] Received message:",
        this.formatMessageForLog(message)
      );

      // Parse and handle specific message types for better logging
      try {
        const parsed = JSON.parse(message);
        this.handleSpecificMessageTypes(parsed);
      } catch {
        console.warn("⚠️ [WebSocket] Could not parse message as JSON");
      }

      if (onMessage) {
        onMessage(message);
      }
    });

    ws.on("close", (code, reason) => {
      const reasonStr = reason?.toString() || "No reason provided";
      console.log(
        `🔌 [WebSocket] Connection closed - Code: ${code}, Reason: ${reasonStr}`
      );

      if (onClose) {
        onClose(code, reasonStr);
      }
    });

    ws.on("error", (error) => {
      console.error("❌ [WebSocket] Error:", error.message);

      if (onError) {
        onError(error);
      }
    });

    return ws;
  }

  private handleSpecificMessageTypes(parsed: {
    type: string;
    delta?: string;
    error?: unknown;
  }) {
    switch (parsed.type) {
      case "session.created":
        console.log("🎯 [WebSocket] Session created successfully");
        break;
      case "response.created":
        console.log("🎯 [WebSocket] Response created successfully");
        break;
      case "response.audio.delta":
        console.log("🔊 [WebSocket] Audio data being streamed");
        break;
      case "response.audio_transcript.delta":
        console.log(`💬 [WebSocket] Audio transcript: "${parsed.delta}"`);
        break;
      case "response.done":
        console.log(
          "✅ [WebSocket] Response completed - audio should be playing"
        );
        break;
      case "error":
        console.error("❌ [WebSocket] Received error:", parsed.error);
        break;
      case "conversation.item.created":
        console.log("💭 [WebSocket] Conversation item created");
        break;
      case "response.output_item.added":
        console.log("📝 [WebSocket] Output item added to response");
        break;
      case "response.content_part.added":
        console.log("🧩 [WebSocket] Content part added to response");
        break;
      default:
        console.log(`📨 [WebSocket] Message type: ${parsed.type}`);
    }
  }

  private formatMessageForLog(message: string): string {
    // Truncate very long messages (like audio data) for cleaner logs
    if (message.length > 500) {
      try {
        const parsed = JSON.parse(message);
        if (parsed.type === "response.audio.delta") {
          return `{"type":"response.audio.delta","delta":"[${
            parsed.delta?.length || 0
          } bytes of audio data]",...}`;
        }
      } catch {
        // If parsing fails, just truncate
      }
      return message.substring(0, 500) + "... [truncated]";
    }
    return message;
  }
}
