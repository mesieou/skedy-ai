import WebSocket from "ws";
import {
  getAuthHeaders,
  OpenAIWebSocketMessage,
} from "./config";

export interface WebSocketConnectionOptions {
  callId: string;
  apiKey: string;
  initialTools?: Array<Record<string, unknown>>; // Initial tools to set via session.update
  onMessage?: (message: string) => void;
  onError?: (error: Error) => void;
  onClose?: (code: number, reason: string) => void;
  onFunctionCall?: (functionName: string, args: Record<string, unknown>, functionCallId: string) => Promise<unknown>;
}

export class WebSocketService {
  private baseUrl = "wss://api.openai.com/v1/realtime";
  private activeWebSocket: WebSocket | null = null;

  async connect(options: WebSocketConnectionOptions): Promise<WebSocket> {
    const { callId, apiKey, initialTools, onMessage, onError, onClose, onFunctionCall } = options;

    console.log("🌐 Connecting to WebSocket for real-time communication...");

    const wsUrl = `${this.baseUrl}?call_id=${callId}`;
    console.log(`🔗 WebSocket URL: ${wsUrl}`);

    const ws = new WebSocket(wsUrl, {
      headers: getAuthHeaders(apiKey),
    });

    this.activeWebSocket = ws;

    ws.on("open", () => {
      console.log("✅ [WebSocket] Connected successfully");

      // First: Set initial tools via session.update (if provided)
      if (initialTools && initialTools.length > 0) {
        console.log("📤 [WebSocket] Setting initial tools via session.update...");
        this.updateSessionTools(initialTools);
      }

      // Then: Send response.create to start conversation
      console.log("📤 [WebSocket] Sending response.create...");
      const responseCreate = {
        type: "response.create"
      };
      ws.send(JSON.stringify(responseCreate));
    });

    ws.on("message", (data) => {
      const message = data.toString();

      // Parse and handle specific message types for better logging
      try {
        const parsed = JSON.parse(message);
        this.handleSpecificMessageTypes(parsed);

        // Handle function calls
        if (onFunctionCall) {
          // Don't await here to avoid blocking message processing
          this.handleFunctionCalls(parsed, onFunctionCall, ws).catch(error => {
            console.error('❌ [WebSocket] Function call handling failed:', error);
          });
        }
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

  /**
   * Handle function calls from OpenAI response.done events
   */
  private async handleFunctionCalls(
    parsed: Record<string, unknown>,
    onFunctionCall: (functionName: string, args: Record<string, unknown>, functionCallId: string) => Promise<unknown>,
    ws: WebSocket
  ): Promise<void> {
    if (parsed.type === 'response.done') {
      const response = parsed.response as { output?: Array<{ type: string; name?: string; arguments?: string; call_id?: string }> };

      if (response?.output) {
        for (const output of response.output) {
          if (output.type === 'function_call' && output.name && output.arguments && output.call_id) {
            const { name: functionName, arguments: argsString, call_id: functionCallId } = output;

            try {
              console.log(`🚀 [WebSocket] Executing function: ${functionName}`);

              // Parse function arguments
              const args = JSON.parse(argsString) as Record<string, unknown>;

              // Execute the function
              const result = await onFunctionCall(functionName, args, functionCallId);

              // Send result back to OpenAI
              await this.sendFunctionResult(functionCallId, result, ws);

            } catch (error) {
              console.error(`❌ [WebSocket] Function execution failed:`, error);

              // Send error result back
              const errorResult = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              };
              await this.sendFunctionResult(functionCallId, errorResult, ws);
            }
          }
        }
      }
    }
  }

  /**
   * Send function call result back to OpenAI
   */
  private async sendFunctionResult(functionCallId: string, result: unknown, ws: WebSocket): Promise<void> {
    const conversationItem = {
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: functionCallId,
        output: JSON.stringify(result)
      }
    };

    console.log('📤 [WebSocket] Sending function result to OpenAI:', conversationItem);
    ws.send(JSON.stringify(conversationItem));

    // Trigger a new response
    const responseCreate = {
      type: "response.create"
    };

    console.log('📤 [WebSocket] Requesting new response from OpenAI');
    ws.send(JSON.stringify(responseCreate));
  }

  /**
   * Send a message via the active WebSocket connection
   */
  sendMessage(message: Record<string, unknown>): void {
    if (this.activeWebSocket && this.activeWebSocket.readyState === WebSocket.OPEN) {
      this.activeWebSocket.send(JSON.stringify(message));
      console.log('📤 [WebSocket] Sent message:', message);
    } else {
      console.warn('⚠️ [WebSocket] Cannot send message - WebSocket not connected');
    }
  }

  /**
   * Update session tools dynamically (for service-specific schemas)
   * Following OpenAI Realtime API session.update specification
   */
  updateSessionTools(tools: Array<Record<string, unknown>>): void {
    const sessionUpdate = {
      type: "session.update",
      session: {
        type: "realtime",           // ✅ Required parameter as per OpenAI error
        tools,                      // Only update tools property
        tool_choice: "auto"         // Ensure AI can choose functions automatically
      },
      event_id: `tools_update_${Date.now()}`  // For error tracking as per OpenAI docs
    };

    console.log('🔄 [WebSocket] Updating session tools:', tools.map((t: Record<string, unknown>) => t.name));
    this.sendMessage(sessionUpdate);
  }

  private handleSpecificMessageTypes(parsed: OpenAIWebSocketMessage) {
    switch (parsed.type) {
      case "session.created":
        console.log("🎯 [WebSocket] Session created successfully");
        if (parsed.session) {
          console.log("🔍 [WebSocket] Session Details:");
          if (parsed.session.model)
            console.log(`   Model: ${parsed.session.model}`);
          if (parsed.session.voice)
            console.log(`   Voice: ${parsed.session.voice}`);
          if (parsed.session.instructions)
            console.log(
              `   Instructions length: ${parsed.session.instructions.length} chars`
            );
          console.log(
            "📋 [WebSocket] Full session config:",
            JSON.stringify(parsed.session, null, 2)
          );
        }
        break;
      case "session.updated":
        console.log("🎯 [WebSocket] Session updated successfully");
        if (parsed.session) {
          const session = parsed.session as Record<string, unknown>; // Type assertion for tools properties
          console.log("🔍 [WebSocket] Updated Session Details:");
          if (session.model)
            console.log(`   Updated Model: ${session.model}`);
          if (session.voice)
            console.log(`   Updated Voice: ${session.voice}`);
                    if (session.tools) {
            const toolNames = Array.isArray(session.tools)
              ? session.tools.map((t: { name?: string }) => t.name).filter(Boolean)
              : [];
            console.log(`   Updated Tools: [${toolNames.join(', ')}]`);
          }
          if (session.tool_choice)
            console.log(`   Tool Choice: ${session.tool_choice}`);
        }
        break;
      case "response.created":
        console.log("🎯 [WebSocket] Response created successfully");
        if (parsed.response) {
          console.log("🔍 [WebSocket] Response Details:");
          if (parsed.response.model)
            console.log(`   Response Model: ${parsed.response.model}`);
          if (parsed.response.voice)
            console.log(`   Response Voice: ${parsed.response.voice}`);
          if (parsed.response.audio?.output?.voice)
            console.log(
              `   Audio Voice: ${parsed.response.audio.output.voice}`
            );
        }
        break;
      case "response.audio.delta":
        // Silent - too verbose
        break;
      case "response.audio_transcript.delta":
        // Silent - too verbose
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
      case "response.function_call_arguments.delta":
      case "response.output_audio_transcript.delta":
      case "input_audio_buffer.speech_started":
      case "input_audio_buffer.speech_stopped":
      case "input_audio_buffer.committed":
      case "rate_limits.updated":
      case "output_audio_buffer.started":
      case "output_audio_buffer.stopped":
        // Silent - too verbose
        break;
      case "response.function_call_arguments.done":
        console.log(`🎯 [WebSocket] Function call completed: ${(parsed as unknown as Record<string, unknown>).name} with args`);
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
