import WebSocket from "ws";
import { getAuthHeaders, OpenAIWebSocketMessage } from "./config";
import { type VoiceEventBus } from "../memory/redis/event-bus";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface WebSocketConnectionOptions {
  callId: string;
  apiKey: string;
  voiceEventBus: VoiceEventBus;
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
  private callId: string | null = null;
  private voiceEventBus: VoiceEventBus | null = null;
  private isProcessingFunctionCall = false; // Prevent duplicate function calls

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  async connect(options: WebSocketConnectionOptions): Promise<WebSocket> {
    const { callId, apiKey, voiceEventBus, initialTools, onMessage, onError, onClose, onFunctionCall } = options;

    this.callId = callId;
    this.voiceEventBus = voiceEventBus;

    console.log(`🌐 [WebSocket] Connecting to OpenAI Realtime API...`);

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
      console.log("✅ [WebSocket] Connected to OpenAI Realtime API");

      if (initialTools && initialTools.length > 0) {
        console.log(`🔧 [WebSocket] Setting ${initialTools.length} initial tools`);
        this.updateSessionTools(initialTools);
      }

      // Start the conversation
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
      console.log(`🔌 [WebSocket] Closed (${code}): ${reasonStr}`);
      onClose?.(code, reasonStr);
    });

    ws.on("error", (error) => {
      console.error("❌ [WebSocket] Error:", error.message);
      onError?.(error);
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
        this.handleMessage(parsed, onFunctionCall, ws);
        onMessage?.(message);
      } catch {
        console.warn("⚠️ [WebSocket] Could not parse message as JSON");
      }
    });
  }

  // ============================================================================
  // MESSAGE HANDLING - SIMPLIFIED
  // ============================================================================

  private handleMessage(
    parsed: OpenAIWebSocketMessage,
    onFunctionCall?: (functionName: string, args: Record<string, unknown>, functionCallId: string) => Promise<unknown>,
    ws?: WebSocket
  ): void {
    const messageType = parsed.type;

    // Only log important events
    if (!this.isVerboseEvent(messageType)) {
      console.log(`📨 [WebSocket] ${messageType}`);
    }

    switch (messageType) {
      case "session.created":
        this.handleSessionCreated(parsed);
        break;

      case "session.updated":
        console.log("🎯 [WebSocket] Session updated");
        break;

      case "conversation.item.done":
        this.handleConversationItem(parsed);
        break;

      case "response.done":
        // Log response details for debugging
        const responseData = parsed as unknown as {
          response?: {
            output?: Array<{ type?: string; content?: Array<{ type?: string; transcript?: string }> }>
          }
        };

        let hasAudio = false;
        let hasTranscript = false;
        let hasFunctionCall = false;

        if (responseData.response?.output) {
          for (const output of responseData.response.output) {
            if (output.type === 'function_call') hasFunctionCall = true;
            if (output.content) {
              for (const content of output.content) {
                if (content.type === 'audio') hasAudio = true;
                if (content.transcript) hasTranscript = true;
              }
            }
          }
        }

        console.log(`📊 [WebSocket] response.done - Audio: ${hasAudio}, Transcript: ${hasTranscript}, FunctionCall: ${hasFunctionCall}`);

        if (!hasAudio && !hasTranscript && !hasFunctionCall) {
          console.warn("⚠️ [WebSocket] Empty response.done - AI generated no content!");

          // CRITICAL: Check if OpenAI sent hidden error details (as per OpenAI community findings)
          console.log("🔍 [WebSocket] Full response.done payload for debugging:");
          console.log(JSON.stringify(parsed, null, 2));

          // Check for OpenAI error fields that might be hidden
          const response = responseData.response as Record<string, unknown>;
          if (response?.status_details) {
            console.error("❌ [WebSocket] OpenAI response status_details:", response.status_details);
          }
          if (response?.error) {
            console.error("❌ [WebSocket] OpenAI response error:", response.error);
          }
        }

        // This is where function calls are detected and executed
        if (onFunctionCall && ws && !this.isProcessingFunctionCall) {
          this.handleFunctionCalls(parsed, onFunctionCall, ws);
        }
        break;

      case "input_audio_buffer.speech_started":
        console.log("🎤 [User started speaking]");
        break;

      case "input_audio_buffer.speech_stopped":
        console.log("🎤 [User stopped speaking]");
        break;

      case "conversation.item.input_audio_transcription.completed":
        this.handleUserTranscript(parsed);
        break;

      case "error":
        this.handleError(parsed);
        break;
    }
  }

  private isVerboseEvent(messageType: string): boolean {
    return messageType.includes('delta') ||
           messageType.includes('output_audio_buffer') ||
           messageType.includes('input_audio_buffer') ||
           messageType === 'response.created' ||
           messageType === 'response.output_item.added' ||
           messageType === 'conversation.item.added' ||
           messageType === 'response.content_part.added' ||
           messageType === 'response.output_audio.done' ||
           messageType === 'response.content_part.done' ||
           messageType === 'conversation.item.done' ||
           messageType === 'response.output_item.done' ||
           messageType === 'rate_limits.updated';
  }

  // ============================================================================
  // SPECIFIC EVENT HANDLERS - SIMPLIFIED
  // ============================================================================

  private handleSessionCreated(parsed: OpenAIWebSocketMessage): void {
    console.log("🎯 [WebSocket] Session created");
    if (parsed.session) {
      console.log(`   Model: ${parsed.session.model}, Voice: ${parsed.session.voice}`);
    }
  }

  private async handleConversationItem(parsed: OpenAIWebSocketMessage): Promise<void> {
    const parsedItem = parsed as unknown as { item?: ConversationItem };
    const item = parsedItem.item;

    if (item?.content && item.role === 'assistant' && this.callId && this.voiceEventBus) {
      const transcript = item.content[0]?.transcript;
      if (transcript) {
        console.log(`🤖 [AI said]: "${transcript}"`);

        // Note: Message storage is handled by CallContextManager directly
        // Removed event publishing to prevent Redis write loops
      }
    }
  }

  private async handleUserTranscript(parsed: OpenAIWebSocketMessage): Promise<void> {
    const transcriptData = parsed as unknown as {
      transcript?: string;
      item_id?: string;
    };

    if (transcriptData.transcript && this.callId && this.voiceEventBus) {
      console.log(`👤 [User said]: "${transcriptData.transcript}"`);

      // Note: Message storage is handled by CallContextManager directly
      // Removed event publishing to prevent Redis write loops
    }
  }

  private handleError(parsed: OpenAIWebSocketMessage): void {
    console.error("❌ [WebSocket] Received error:", parsed.error);
    const errorData = parsed as OpenAIWebSocketMessage & { event_id?: string };
    if (errorData.event_id) {
      console.error(`   🏷️ Error related to event_id: ${errorData.event_id}`);
    }
  }

  // ============================================================================
  // FUNCTION CALL HANDLING - FIXED FLOW
  // ============================================================================

  private async handleFunctionCalls(
    parsed: OpenAIWebSocketMessage,
    onFunctionCall: (functionName: string, args: Record<string, unknown>, functionCallId: string) => Promise<unknown>,
    ws: WebSocket
  ): Promise<void> {
    const response = parsed.response as { output?: Array<FunctionCallOutput> };
    if (!response?.output) return;

    // Check if there are any function calls to execute
    const functionCalls = response.output.filter(
      output => output.type === 'function_call' && output.name && output.arguments && output.call_id
    );

    if (functionCalls.length === 0) return;

    // Set processing flag to prevent duplicates
    this.isProcessingFunctionCall = true;

    try {
      // Execute all function calls in sequence
      for (const functionCall of functionCalls) {
        await this.executeFunctionCall(functionCall, onFunctionCall, ws);
      }

      // After all function calls are complete, request a new response
      console.log("⏳ [WebSocket] All function calls completed, waiting before requesting AI response...");
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify WebSocket is still connected before requesting response
      if (this.activeWebSocket?.readyState !== WebSocket.OPEN) {
        console.error("❌ [WebSocket] Cannot request response - connection not open");
        return;
      }

      const responseEventId = `response_request_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      console.log("🔄 [WebSocket] Requesting AI response...");
      console.log(`📡 [WebSocket] Sending response.create with event_id: ${responseEventId}`);

      const responseMessage = {
        type: "response.create",
        event_id: responseEventId
      };

      console.log(`📨 [WebSocket] Response request payload: ${JSON.stringify(responseMessage)}`);
      this.sendMessage(responseMessage);
      console.log(`✅ [WebSocket] Response request sent, waiting for OpenAI...`);

    } finally {
      // Reset processing flag
      this.isProcessingFunctionCall = false;
    }
  }

  private async executeFunctionCall(
    output: FunctionCallOutput,
    onFunctionCall: (functionName: string, args: Record<string, unknown>, functionCallId: string) => Promise<unknown>,
    ws: WebSocket
  ): Promise<void> {
    const { name: functionName, arguments: argsString, call_id: functionCallId } = output;

    console.log(`🔧 [WebSocket] Executing function: ${functionName}`);

    try {
      const args = JSON.parse(argsString!) as Record<string, unknown>;
      console.log(`📝 [Function Args]:`, args);

      const startTime = Date.now();

      // Set up keepalive for long-running functions
      const keepaliveInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          // Send a ping to keep connection alive
          ws.ping();
          console.log(`💓 [WebSocket] Keepalive ping sent during ${functionName} execution`);
        }
      }, 5000); // Every 5 seconds

      try {
        const result = await onFunctionCall(functionName!, args, functionCallId!);
        const executionTime = Date.now() - startTime;

        console.log(`✅ [WebSocket] ${functionName} completed (${executionTime}ms)`);
        console.log(`📊 [Function Result]:`, result);

        // Send the function result back to OpenAI
        await this.sendFunctionResult(functionCallId!, result, ws);

      } finally {
        // Always clear the keepalive interval
        clearInterval(keepaliveInterval);
      }

    } catch (error) {
      console.error(`❌ [WebSocket] ${functionName} failed:`, error instanceof Error ? error.message : error);

      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      await this.sendFunctionResult(functionCallId!, errorResult, ws);
    }
  }

  private async sendFunctionResult(functionCallId: string, result: unknown, ws: WebSocket): Promise<void> {
    const eventId = `function_result_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    try {
      // Ensure result can be properly serialized
      const serializedResult = JSON.stringify(result);

      const conversationItem = {
        event_id: eventId,
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCallId,
          output: serializedResult
        }
      };

      console.log(`📤 [WebSocket] Sending function result for call: ${functionCallId}`);
      console.log(`   📊 Result size: ${serializedResult.length} characters`);
      console.log(`   🔍 Function result preview: ${serializedResult.substring(0, 200)}...`);

      // Verify WebSocket is still open
      if (ws.readyState !== WebSocket.OPEN) {
        console.error(`❌ [WebSocket] Cannot send function result - connection not open (state: ${ws.readyState})`);
        return;
      }

      console.log(`📡 [WebSocket] Sending conversation.item.create with event_id: ${eventId}`);
      ws.send(JSON.stringify(conversationItem));
      console.log(`✅ [WebSocket] Function result sent successfully`);

      // Longer delay for complex results to ensure proper processing
      const delay = serializedResult.length > 1000 ? 150 : 75;
      console.log(`⏱️ [WebSocket] Waiting ${delay}ms for function result processing...`);
      await new Promise(resolve => setTimeout(resolve, delay));

    } catch (error) {
      console.error(`❌ [WebSocket] Failed to send function result:`, error);

      // Send a simplified error result
      const errorItem = {
        event_id: eventId,
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCallId,
          output: JSON.stringify({
            success: false,
            error: "Failed to serialize function result",
            message: "There was an issue processing the function result"
          })
        }
      };

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(errorItem));
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
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

    console.log(`🔄 [WebSocket] Updating session with ${tools.length} tools`);
    this.sendMessage(sessionUpdate);
  }

  sendMessage(message: Record<string, unknown>): void {
    if (this.activeWebSocket && this.activeWebSocket.readyState === WebSocket.OPEN) {
      this.activeWebSocket.send(JSON.stringify(message));
    } else {
      console.warn(`⚠️ [WebSocket] Cannot send ${message.type} - not connected`);
    }
  }
}
