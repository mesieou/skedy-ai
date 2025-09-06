import WebSocket from "ws";
import { getAuthHeaders, OpenAIWebSocketMessage } from "./config";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface WebSocketConnectionOptions {
  callId: string;
  apiKey: string;
  initialTools?: Array<Record<string, unknown>>;
  onMessage?: (message: string) => void;
  onError?: (error: Error) => void;
  onClose?: (code: number, reason: string) => void;
  onFunctionCall?: (functionName: string, args: Record<string, unknown>, functionCallId: string) => Promise<unknown>;
}

interface ConversationItem {
  role?: string;
  content?: Array<{
    transcript?: string;
    type?: string;
  }>;
}

interface FunctionCallOutput {
  type: string;
  name?: string;
  arguments?: string;
  call_id?: string;
}

// ============================================================================
// WEBSOCKET SERVICE CLASS
// ============================================================================

export class WebSocketService {
  private readonly baseUrl = "wss://api.openai.com/v1/realtime";
  private activeWebSocket: WebSocket | null = null;

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  async connect(options: WebSocketConnectionOptions): Promise<WebSocket> {
    const { callId, apiKey, initialTools, onMessage, onError, onClose, onFunctionCall } = options;

    console.log("🌐 Connecting to WebSocket for real-time communication...");
    console.log(`🔗 WebSocket URL: ${this.baseUrl}?call_id=${callId}`);

    const ws = new WebSocket(`${this.baseUrl}?call_id=${callId}`, {
      headers: getAuthHeaders(apiKey),
    });

    this.activeWebSocket = ws;

    // Setup event handlers
    this.setupConnectionHandlers(ws, onError, onClose);
    this.setupMessageHandlers(ws, onMessage, onFunctionCall);
    this.setupOpenHandler(ws, initialTools);

    return ws;
  }

  private setupOpenHandler(ws: WebSocket, initialTools?: Array<Record<string, unknown>>): void {
    ws.on("open", () => {
      console.log("✅ [WebSocket] Connected successfully");

      // Set initial tools if provided
      if (initialTools && initialTools.length > 0) {
        console.log(`📤 [WebSocket] Setting initial tools: [${initialTools.map(t => t.name).join(', ')}]`);
        this.updateSessionTools(initialTools);
      }

      // Start conversation
      this.sendMessage({ type: "response.create" });
    });
  }

  private setupConnectionHandlers(
    ws: WebSocket,
    onError?: (error: Error) => void,
    onClose?: (code: number, reason: string) => void
  ): void {
    ws.on("close", (code, reason) => {
      const reasonStr = reason?.toString() || "No reason provided";
      console.log(`🔌 [WebSocket] Connection closed - Code: ${code}, Reason: ${reasonStr}`);

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
  }

  private setupMessageHandlers(
    ws: WebSocket,
    onMessage?: (message: string) => void,
    onFunctionCall?: (functionName: string, args: Record<string, unknown>, functionCallId: string) => Promise<unknown>
  ): void {
    ws.on("message", (data) => {
      const message = data.toString();

      try {
        const parsed = JSON.parse(message);

        // Handle specific message types
        this.handleMessage(parsed);

        // Handle function calls
        if (onFunctionCall) {
          this.handleFunctionCalls(parsed, onFunctionCall, ws).catch(error => {
            console.error('❌ [WebSocket] Function call handling failed:', error);
          });
        }

        // Pass through to custom handler
        if (onMessage) {
          onMessage(message);
        }

      } catch {
        console.warn("⚠️ [WebSocket] Could not parse message as JSON");
      }
    });
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  private handleMessage(parsed: OpenAIWebSocketMessage): void {
    const messageType = parsed.type;

    switch (messageType) {
      // Session Management
      case "session.created":
        this.handleSessionCreated(parsed);
        break;
      case "session.updated":
        console.log("🎯 [WebSocket] Session updated successfully");
        break;

      // Conversation Flow
      case "conversation.item.done":
        this.handleConversationItem(parsed);
        break;
      case "response.done":
        console.log("✅ [WebSocket] Response completed - audio should be playing");
        break;

      // User Speech Detection
      case "input_audio_buffer.speech_started":
        console.log("🎤 [User started speaking]");
        break;
      case "input_audio_buffer.speech_stopped":
        console.log("🎤 [User stopped speaking]");
        break;
      case "input_audio_buffer.committed":
        console.log("🎤 [User audio committed - processing...]");
        break;

      // User Transcription
      case "conversation.item.input_audio_transcription.completed":
        this.handleUserTranscript(parsed);
        break;

      // Function Calling
      case "response.function_call_arguments.done":
        this.handleFunctionCallCompleted(parsed);
        break;

      // Errors
      case "error":
        console.error("❌ [WebSocket] Received error:", parsed.error);
        break;

      // Silent events (too verbose for normal operation)
      case "conversation.item.created":
      case "conversation.item.added":
      case "response.created":
      case "response.output_item.added":
      case "response.content_part.added":
      case "response.output_audio.done":
      case "response.output_audio_transcript.done":
      case "response.content_part.done":
      case "response.output_item.done":
      case "response.audio.delta":
      case "response.audio_transcript.delta":
      case "response.output_audio_transcript.delta":
      case "input_audio_transcript.delta":
      case "conversation.item.input_audio_transcription.delta":
      case "response.function_call_arguments.delta":
      case "rate_limits.updated":
      case "output_audio_buffer.started":
      case "output_audio_buffer.stopped":
        // Silent - normal WebSocket events
        break;

      default:
        // Silent for truly unknown events
        break;
    }
  }

  // ============================================================================
  // SPECIFIC EVENT HANDLERS
  // ============================================================================

  private handleSessionCreated(parsed: OpenAIWebSocketMessage): void {
    console.log("🎯 [WebSocket] Session created successfully");

    if (parsed.session) {
      const session = parsed.session as Record<string, unknown>;

      console.log("🔍 [Session Details]:");
      console.log(`   Model: ${parsed.session.model}`);
      console.log(`   Voice: ${parsed.session.voice}`);

      // Check transcription status
      if (session.input_audio_transcription) {
        console.log(`   🎤 Transcription: Enabled`);
      } else {
        console.log(`   🎤 Transcription: NOT CONFIGURED`);
      }
    }
  }

  private handleConversationItem(parsed: OpenAIWebSocketMessage): void {
    const parsedItem = parsed as unknown as { item?: ConversationItem };
    const item = parsedItem.item;

    if (item?.content && item.role === 'assistant') {
      const transcript = item.content[0]?.transcript;
      if (transcript) {
        console.log(`🤖 [AI said]: "${transcript}"`);
      }
    }
    // User transcripts are handled by transcription.completed events
  }

  private handleUserTranscript(parsed: OpenAIWebSocketMessage): void {
    const transcriptData = parsed as unknown as {
      transcript?: string;
      item_id?: string;
    };

    if (transcriptData.transcript) {
      console.log(`👤 [User said]: "${transcriptData.transcript}"`);
    }
  }

  private handleFunctionCallCompleted(parsed: OpenAIWebSocketMessage): void {
    const functionData = parsed as unknown as { name?: string };
    if (functionData.name) {
      console.log(`🎯 [Function completed]: ${functionData.name}`);
    }
  }

  // ============================================================================
  // FUNCTION CALL HANDLING
  // ============================================================================

  private async handleFunctionCalls(
    parsed: Record<string, unknown>,
    onFunctionCall: (functionName: string, args: Record<string, unknown>, functionCallId: string) => Promise<unknown>,
    ws: WebSocket
  ): Promise<void> {
    if (parsed.type !== 'response.done') return;

    const response = parsed.response as { output?: Array<FunctionCallOutput> };
    if (!response?.output) return;

    for (const output of response.output) {
      if (output.type === 'function_call' && output.name && output.arguments && output.call_id) {
        await this.executeFunctionCall(output, onFunctionCall, ws);
      }
    }
  }

  private async executeFunctionCall(
    output: FunctionCallOutput,
    onFunctionCall: (functionName: string, args: Record<string, unknown>, functionCallId: string) => Promise<unknown>,
    ws: WebSocket
  ): Promise<void> {
    const { name: functionName, arguments: argsString, call_id: functionCallId } = output;

    try {
      console.log(`🚀 [Function Call]: ${functionName}`);
      console.log(`📋 [Call ID]: ${functionCallId}`);

      const args = JSON.parse(argsString!) as Record<string, unknown>;

      // Log function parameters in detail
      this.logFunctionParameters(functionName!, args);

      const result = await onFunctionCall(functionName!, args, functionCallId!);

      // Log function result details
      this.logFunctionResult(functionName!, result);

      await this.sendFunctionResult(functionCallId!, result, ws);

    } catch (error) {
      console.error(`❌ [Function Error]: ${functionName} failed`);
      console.error(`   Error Details:`, error instanceof Error ? error.message : error);

      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      await this.sendFunctionResult(functionCallId!, errorResult, ws);
    }
  }

  private async sendFunctionResult(functionCallId: string, result: unknown, ws: WebSocket): Promise<void> {
    const conversationItem = {
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: functionCallId,
        output: JSON.stringify(result)
      }
    };

    console.log(`📤 [Function Response]: Sending result for ${functionCallId}`);
    ws.send(JSON.stringify(conversationItem));

    // Trigger new response
    ws.send(JSON.stringify({ type: "response.create" }));
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  updateSessionTools(tools: Array<Record<string, unknown>>): void {
    const sessionUpdate = {
      type: "session.update",
      session: {
        type: "realtime",
        tools,
        tool_choice: "auto"
      },
      event_id: `tools_update_${Date.now()}`
    };

    console.log(`🔄 [Session Update]: Tools updated - [${tools.map(t => t.name).join(', ')}]`);
    this.sendMessage(sessionUpdate);
  }

  sendMessage(message: Record<string, unknown>): void {
    if (this.activeWebSocket && this.activeWebSocket.readyState === WebSocket.OPEN) {
      this.activeWebSocket.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ [WebSocket] Cannot send message - WebSocket not connected');
    }
  }

  // ============================================================================
  // FUNCTION CALL LOGGING
  // ============================================================================

  private logFunctionParameters(functionName: string, args: Record<string, unknown>): void {
    console.log(`📝 [AI Called]: ${functionName}`, args);
  }

  private logFunctionResult(functionName: string, result: unknown): void {
    console.log(`✅ [Function Result]: ${functionName}`, result);
  }

}
