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

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  async connect(options: WebSocketConnectionOptions): Promise<WebSocket> {
    const { callId, apiKey, voiceEventBus, initialTools, onMessage, onError, onClose, onFunctionCall } = options;

    // Store for message event publishing
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

      // Set initial tools if provided
      if (initialTools && initialTools.length > 0) {
        console.log(`🔧 [WebSocket] Setting ${initialTools.length} function schemas`);
        initialTools.forEach(tool => {
          console.log(`   📋 Function: ${tool.name}`);

        });

        this.updateSessionTools(initialTools);
      }
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

    // Skip logging verbose messages to reduce log noise
    const skipLogging = messageType.includes('delta') ||
                       messageType.includes('output_audio_buffer') ||
                       messageType.includes('input_audio_buffer') ||
                       messageType === 'response.audio_transcript.delta' ||
                       messageType === 'conversation.item.input_audio_transcription.delta' ||
                       messageType === 'response.output_audio_transcript.delta' ||
                       messageType === 'response.done' ||
                       messageType === 'response.output_item.done' ||
                       messageType === 'response.created' ||
                       messageType === 'response.output_item.added' ||
                       messageType === 'conversation.item.added' ||
                       messageType === 'response.content_part.added' ||
                       messageType === 'response.output_audio.done' ||
                       messageType === 'response.output_audio_transcript.done' ||
                       messageType === 'response.content_part.done' ||
                       messageType === 'conversation.item.done' ||
                       messageType === 'conversation.item.input_audio_transcription.completed';

    if (!skipLogging) {
      // Log important OpenAI messages for tracking
      console.log(`📨 [WebSocket] ${messageType}`);
    }

    switch (messageType) {
      // Session Management
      case "session.created":
        this.handleSessionCreated(parsed);
        break;
      case "session.updated":
        console.log("🎯 [WebSocket] Session updated");
        break;

      // Conversation Flow
      case "conversation.item.done":
        this.handleConversationItem(parsed).catch(error => {
          console.error('❌ [WebSocket] Failed to handle conversation item:', error);
        });
        break;
      case "response.done":
        this.handleResponseDone(parsed);
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
        this.handleUserTranscript(parsed).catch(error => {
          console.error('❌ [WebSocket] Failed to handle user transcript:', error);
        });
        break;

      // Function Calling
      case "response.function_call_arguments.done":
        this.handleFunctionCallCompleted(parsed);
        break;

      // Response monitoring - detect when AI starts speaking after function calls
      case "response.audio.delta":
      case "response.output_audio_transcript.delta":
        // AI is generating audio - this is good
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
    console.log("🎯 [WebSocket] Session created");

    if (parsed.session) {
      const session = parsed.session as Record<string, unknown>;
      const transcriptionStatus = session.input_audio_transcription ? "✅" : "❌";
      console.log(`   Model: ${parsed.session.model}, Voice: ${parsed.session.voice}, Transcription: ${transcriptionStatus}`);
    }
  }

  private async handleConversationItem(parsed: OpenAIWebSocketMessage): Promise<void> {
    const parsedItem = parsed as unknown as { item?: ConversationItem };
    const item = parsedItem.item;

    if (item?.content && item.role === 'assistant' && this.callId && this.voiceEventBus) {
      const transcript = item.content[0]?.transcript;
      if (transcript) {
        console.log(`🤖 [AI said]: "${transcript}"`);

        // Publish assistant message event for storage in Redis
        await this.voiceEventBus.publish({
          type: 'voice:message:assistant',
          callId: this.callId,
          timestamp: Date.now(),
          data: {
            content: transcript,
            openai_item_id: (parsedItem as { item_id?: string }).item_id
          }
        });
      }
    }
    // User transcripts are handled by transcription.completed events
  }

  private async handleUserTranscript(parsed: OpenAIWebSocketMessage): Promise<void> {
    const transcriptData = parsed as unknown as {
      transcript?: string;
      item_id?: string;
    };

    if (transcriptData.transcript && this.callId && this.voiceEventBus) {
      console.log(`👤 [User said]: "${transcriptData.transcript}"`);

      // Publish user message event for storage in Redis
      await this.voiceEventBus.publish({
        type: 'voice:message:user',
        callId: this.callId,
        timestamp: Date.now(),
        data: {
          content: transcriptData.transcript,
          openai_item_id: transcriptData.item_id
        }
      });
    }
  }

  private handleFunctionCallCompleted(parsed: OpenAIWebSocketMessage): void {
    const functionData = parsed as unknown as { name?: string };
    if (functionData.name) {
      console.log(`🎯 [Function completed]: ${functionData.name}`);
    }
  }

  private handleResponseDone(parsed: OpenAIWebSocketMessage): void {
    const responseData = parsed as unknown as {
      response?: {
        output?: Array<{
          type?: string;
          content?: Array<{ type?: string; transcript?: string; audio?: unknown }>
        }>
      }
    };

    if (responseData.response?.output) {
      let hasAudio = false;
      let hasTranscript = false;

      for (const output of responseData.response.output) {
        if (output.content) {
          for (const content of output.content) {
            if (content.type === 'audio') hasAudio = true;
            if (content.transcript) hasTranscript = true;
          }
        }
      }

      if (!hasAudio && !hasTranscript) {
        console.log("⚠️  [WebSocket] Response completed with no audio/transcript");
      } else {
        console.log("✅ [WebSocket] Response completed");
      }
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

    console.log(`🔧 [WebSocket] Function call: ${functionName}`);
    try {
      console.log(`🔍 [WebSocket] Raw arguments string length: ${argsString?.length || 0}`);
      const args = JSON.parse(argsString!) as Record<string, unknown>;

      // Log function parameters in detail
      this.logFunctionParameters(functionName!, args);

      const startTime = Date.now();
      const result = await onFunctionCall(functionName!, args, functionCallId!);
      const executionTime = Date.now() - startTime;

      console.log(`✅ [WebSocket] ${functionName} completed (${executionTime}ms)`);

      // Log function result details
      this.logFunctionResult(functionName!, result);

      await this.sendFunctionResult(functionCallId!, result, ws);

    } catch (error) {
      console.error(`❌ [WebSocket] ${functionName} failed:`, error instanceof Error ? error.message : error);

      // Debug malformed JSON
      if (error instanceof SyntaxError && argsString) {
        console.error(`🔍 [WebSocket] Malformed JSON details:`);
        console.error(`   Length: ${argsString.length}`);
        console.error(`   First 500 chars: ${argsString.substring(0, 500)}`);
        console.error(`   Last 500 chars: ${argsString.substring(Math.max(0, argsString.length - 500))}`);

        // Try to find the error position
        const match = error.message.match(/position (\d+)/);
        if (match) {
          const position = parseInt(match[1]);
          const start = Math.max(0, position - 50);
          const end = Math.min(argsString.length, position + 50);
          console.error(`   Around error position ${position}: "${argsString.substring(start, end)}"`);
        }
      }

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

    console.log(`📤 [WebSocket] Sending function result to OpenAI:`);
    ws.send(JSON.stringify(conversationItem));
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

    console.log(`🔄 [WebSocket] Updating OpenAI session tools:`);
    console.log(`   📊 Tool count: ${tools.length}`);
    tools.forEach(tool => {
      console.log(`   🔧 Tool: ${tool.name} - ${tool.description || 'No description'}`);
    });

    this.sendMessage(sessionUpdate);
  }

  sendMessage(message: Record<string, unknown>): void {
    if (this.activeWebSocket && this.activeWebSocket.readyState === WebSocket.OPEN) {
      this.activeWebSocket.send(JSON.stringify(message));
    } else {
      console.warn(`⚠️ [WebSocket] Cannot send ${message.type} - not connected`);
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
