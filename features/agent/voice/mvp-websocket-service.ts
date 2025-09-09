/**
 * MVP WebSocket Service - Token Optimized
 *
 * Key optimizations:
 * 1. Conversation truncation and summarization
 * 2. Output token limits per response
 * 3. Smart tool schema updates only when changed
 * 4. Minimal session updates
 */

import WebSocket from "ws";
import crypto from "crypto";
import { getAuthHeaders, OpenAIWebSocketMessage } from "./config";
import { type VoiceEventBus } from "../memory/redis/event-bus";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

// Extended OpenAI message types for proper typing
interface SessionCreatedMessage extends OpenAIWebSocketMessage {
  type: "session.created";
  session: {
    conversation_id: string;
    model?: string;
    voice?: string;
  };
}

interface ResponseDoneMessage extends OpenAIWebSocketMessage {
  type: "response.done";
  response: {
    usage?: {
      total_tokens: number;
      input_tokens: number;
      output_tokens: number;
    };
    status?: string;
    conversation_id?: string;
  };
}

interface AudioTranscriptMessage extends OpenAIWebSocketMessage {
  type: "response.output_audio_transcript.done";
  transcript: string;
}

interface UserTranscriptMessage extends OpenAIWebSocketMessage {
  type: "conversation.item.input_audio_transcription.completed";
  transcript: string;
}

// FunctionCallMessage not needed - function calls are handled in response.done

export interface MVPWebSocketConnectionOptions {
  callId: string;
  businessId: string;
  apiKey: string;
  voiceEventBus: VoiceEventBus;
  initialTools?: Array<Record<string, unknown>>;
  onMessage?: (message: string) => void;
  onError?: (error: Error) => void;
  onClose?: (code: number, reason: string) => void;
  onFunctionCall?: (functionName: string, args: Record<string, unknown>, functionCallId: string) => Promise<unknown>;
}

// Simplified: Just what we actually need for optimization

// ============================================================================
// MVP WEBSOCKET SERVICE CLASS
// ============================================================================

export class MVPWebSocketService {
  private readonly baseUrl = "wss://api.openai.com/v1/realtime";
  private activeWebSocket: WebSocket | null = null;
  private callId: string | null = null;
  private businessId: string | null = null;
  private voiceEventBus: VoiceEventBus | null = null;
  private isProcessingFunctionCall = false;

  // Core optimization settings
  private readonly MAX_TURNS_BEFORE_SUMMARY = 6;
  private readonly MAX_OUTPUT_TOKENS = 120;

  // Simple tracking for optimization
  private turnCount = 0;

  // Schema management
  private currentSchemaHash: string | null = null;
  private conversationId: string | null = null;

  // Token tracking
  private cumulativeTokens = 0;
  private sessionStartTime = Date.now();

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  async connect(options: MVPWebSocketConnectionOptions): Promise<WebSocket> {
    const { callId, businessId, apiKey, voiceEventBus, initialTools, onMessage, onError, onClose, onFunctionCall } = options;

    this.callId = callId;
    this.businessId = businessId;
    this.voiceEventBus = voiceEventBus;

    console.log(`🌐 [MVP WebSocket] Connecting to OpenAI Realtime API...`);
    console.log(`🎯 [MVP WebSocket] Call: ${callId}, Business: ${businessId}`);

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
      console.log("✅ [MVP WebSocket] Connected to OpenAI Realtime API");

      if (initialTools && initialTools.length > 0) {
        console.log(`🔧 [MVP WebSocket] Setting ${initialTools.length} initial tools`);
        this.updateSessionToolsIfChanged(initialTools);
      }

      // Start conversation with optimized response settings
      this.requestOptimizedResponse(false);
    });
  }

  private setupConnectionHandlers(
    ws: WebSocket,
    onError?: (error: Error) => void,
    onClose?: (code: number, reason: string) => void
  ): void {
    ws.on("error", (error: Error) => {
      console.error(`❌ [MVP WebSocket] Connection error:`, error.message);
      if (onError) onError(error);
    });

    ws.on("close", (code: number, reason: string) => {
      console.log(`🔌 [MVP WebSocket] Closed (${code}): ${reason || 'No reason provided'}`);
      this.activeWebSocket = null;
      if (onClose) onClose(code, reason);
    });
  }

  private setupMessageHandlers(
    ws: WebSocket,
    onMessage?: (message: string) => void,
    onFunctionCall?: (functionName: string, args: Record<string, unknown>, functionCallId: string) => Promise<unknown>
  ): void {
    ws.on("message", async (data: WebSocket.Data) => {
      try {
        const message = data.toString();
        if (onMessage) onMessage(message);

        const parsed = JSON.parse(message) as OpenAIWebSocketMessage;
        await this.handleIncomingMessage(parsed, onFunctionCall);
      } catch (error) {
        console.error("❌ [MVP WebSocket] Message parsing error:", error);
      }
    });
  }

  // ============================================================================
  // MESSAGE HANDLING WITH TOKEN OPTIMIZATION
  // ============================================================================

  private async handleIncomingMessage(
    message: OpenAIWebSocketMessage,
    onFunctionCall?: (functionName: string, args: Record<string, unknown>, functionCallId: string) => Promise<unknown>
  ): Promise<void> {
    const messageType = message.type;

    switch (messageType) {
      case "session.created":
        const sessionMessage = message as SessionCreatedMessage;
        this.conversationId = sessionMessage.session.conversation_id;
        console.log(`🎯 [MVP WebSocket] Session created: ${this.conversationId}`);
        break;

      case "session.updated":
        console.log("🎯 [MVP WebSocket] Session updated (MVP optimized)");
        break;

      case "response.done":
        await this.handleResponseDone(message as ResponseDoneMessage);
        // Check for function calls in response.done
        if (onFunctionCall) {
          await this.handleFunctionCallsInResponse(message, onFunctionCall);
        }
        break;

      case "response.output_audio_transcript.done":
        this.handleAudioTranscript(message as AudioTranscriptMessage);
        break;

      case "conversation.item.input_audio_transcription.completed":
        await this.handleUserTranscript(message as UserTranscriptMessage);
        break;

      case "conversation.item.done":
        // OpenAI confirms function result was processed
        console.log("📝 [MVP WebSocket] Function result processed by OpenAI");
        break;

      case "response.function_call_arguments.done":
        // This event type might not contain the function call data we need
        // Function calls are actually in response.done
        break;

      default:
        // Log other events for debugging without processing
        if (messageType.includes('error') || messageType.includes('failed')) {
          console.error(`❌ [MVP WebSocket] Error event: ${messageType}`, message);
        }
        break;
    }
  }

  private async handleResponseDone(message: ResponseDoneMessage): Promise<void> {
    const usage = message.response.usage;
    if (usage?.total_tokens) {
      this.cumulativeTokens += usage.total_tokens;
      const sessionTime = Math.round((Date.now() - this.sessionStartTime) / 1000);
      const tokensPerSecond = Math.round(this.cumulativeTokens / Math.max(sessionTime, 1));

      console.log(`📊 [MVP Tokens] This response: ${usage.total_tokens} (${usage.input_tokens} in, ${usage.output_tokens} out)`);
      console.log(`📊 [MVP Tokens] Session total: ${this.cumulativeTokens} tokens in ${sessionTime}s (${tokensPerSecond} tokens/sec)`);

      // Alert if approaching limits
      if (tokensPerSecond > 500) {
        console.warn(`⚠️ [MVP Tokens] HIGH USAGE: ${tokensPerSecond} tokens/sec`);
      }
    }

    // Check if we need conversation management
    this.turnCount++;
    if (this.turnCount >= this.MAX_TURNS_BEFORE_SUMMARY) {
      await this.manageConversation();
    }
  }

  private handleAudioTranscript(message: AudioTranscriptMessage): void {
    const transcript = message.transcript;
    if (transcript) {
      console.log(`🤖 [MVP AI said]: "${transcript}"`);
    }
  }

  private async handleUserTranscript(message: UserTranscriptMessage): Promise<void> {
    const transcript = message.transcript;
    if (transcript) {
      console.log(`👤 [MVP User said]: "${transcript}"`);
    }
  }

  private async handleFunctionCallsInResponse(
    message: OpenAIWebSocketMessage,
    onFunctionCall: (functionName: string, args: Record<string, unknown>, functionCallId: string) => Promise<unknown>
  ): Promise<void> {
    if (this.isProcessingFunctionCall) {
      console.warn("⚠️ [MVP WebSocket] Function call already in progress, skipping");
      return;
    }

    try {
      // Look for function calls in response.output (like original)
      interface FunctionCallOutput {
        type: string;
        name?: string;
        arguments?: string;
        call_id?: string;
      }

      const response = (message as { response?: { output?: FunctionCallOutput[] } }).response;
      if (!response?.output) return;

      // Check if there are any function calls to execute
      const functionCalls = response.output.filter(
        (output: FunctionCallOutput) => output.type === 'function_call' && output.name && output.arguments && output.call_id
      );

      if (functionCalls.length === 0) return;

      // Set processing flag to prevent duplicates
      this.isProcessingFunctionCall = true;

      // Execute all function calls in sequence
      for (const functionCall of functionCalls) {
        console.log(`🔧 [MVP WebSocket] Executing function: ${functionCall.name}`);

        const args = JSON.parse(functionCall.arguments || "{}");
        const result = await onFunctionCall(functionCall.name!, args, functionCall.call_id!);

        // Send function result
        await this.sendFunctionResult(functionCall.call_id!, result);
      }

      // Request optimized response after all function calls (no artificial delays)
      console.log(`🔄 [MVP WebSocket] Requesting AI response...`);
      await this.requestOptimizedResponse(true);

    } catch (error) {
      console.error("❌ [MVP WebSocket] Function call error:", error);
    } finally {
      this.isProcessingFunctionCall = false;
    }
  }

  // ============================================================================
  // CONVERSATION MANAGEMENT & OPTIMIZATION
  // ============================================================================

  private async manageConversation(): Promise<void> {
    console.log(`🔄 [MVP Conversation] Managing conversation (turn ${this.turnCount})`);

    // Simple summary - let Redis context handle the details
    const summary = "CONTEXT SUMMARY: Previous conversation context maintained. Continue assisting customer.";

    // Push summary as system message
    await this.sendMessage({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "system",
        content: [{ type: "input_text", text: summary }]
      }
    });

    // Truncate old conversation
    if (this.conversationId) {
      await this.sendMessage({
        type: "conversation.truncate",
        conversation_id: this.conversationId,
        keep_last: 2 // Keep last 2 turns + our summary
      });
    }

    // Reset turn counter
    this.turnCount = 2; // Account for kept messages
    console.log(`✅ [MVP Conversation] Truncated and summarized`);
  }

  // ============================================================================
  // OPTIMIZED RESPONSE MANAGEMENT
  // ============================================================================

  private async requestOptimizedResponse(isIntermediate: boolean = false): Promise<void> {
    const responseEventId = `response_request_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const responseConfig = {
      type: "response.create",
      event_id: responseEventId,
      response: {
        conversation: isIntermediate ? "none" : "auto",
        // Remove max_output_tokens - let AI finish sentences naturally
        output_modalities: ["audio"] as const
      }
    };

    console.log(`🎯 [MVP Response] Requesting ${isIntermediate ? 'intermediate' : 'main'} response (no token limit - let AI finish naturally)`);
    console.log(`📡 [MVP WebSocket] Sending response.create with event_id: ${responseEventId}`);
    console.log(`📨 [MVP WebSocket] Response request payload:`, JSON.stringify(responseConfig));

    await this.sendMessage(responseConfig);
    console.log(`✅ [MVP WebSocket] Response request sent, waiting for OpenAI...`);
  }

  // ============================================================================
  // SMART TOOL MANAGEMENT
  // ============================================================================

  async updateSessionToolsIfChanged(tools: Array<Record<string, unknown>>): Promise<void> {
    const newHash = this.hashTools(tools);

    if (newHash !== this.currentSchemaHash) {
      const sessionUpdate = {
        type: "session.update",
        session: {
          type: "realtime",
          tools,
          tool_choice: "auto"
        }
      };

      console.log(`🔄 [MVP Tools] Updating ${tools.length} tools (hash: ${newHash.slice(0,8)})`);
      await this.sendMessage(sessionUpdate);
      this.currentSchemaHash = newHash;
    } else {
      console.log(`✅ [MVP Tools] Tools unchanged, skipping update`);
    }
  }

  private hashTools(tools: Array<Record<string, unknown>>): string {
    const toolNames = tools.map(t => t.name).sort();
    return crypto.createHash('md5')
      .update(JSON.stringify(toolNames))
      .digest('hex');
  }

  // ============================================================================
  // CORE MESSAGING
  // ============================================================================

  private async sendFunctionResult(functionCallId: string, result: unknown): Promise<void> {
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

      console.log(`📤 [MVP WebSocket] Sending function result for call: ${functionCallId}`);
      console.log(`   📊 Result size: ${serializedResult.length} characters`);
      console.log(`   🔍 Function result preview: ${serializedResult.substring(0, 200)}...`);

      // Send the result
      await this.sendMessage(conversationItem);
      console.log(`✅ [MVP WebSocket] Function result sent successfully`);

    } catch (error) {
      console.error(`❌ [MVP WebSocket] Failed to send function result for ${functionCallId}:`, error);

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

      await this.sendMessage(errorItem);
    }
  }

  async sendMessage(message: Record<string, unknown>): Promise<void> {
    if (this.activeWebSocket && this.activeWebSocket.readyState === WebSocket.OPEN) {
      this.activeWebSocket.send(JSON.stringify(message));
    } else {
      console.warn(`⚠️ [MVP WebSocket] Cannot send ${message.type} - not connected`);
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  getTokenUsage(): { total: number; rate: number; duration: number } {
    const duration = Math.round((Date.now() - this.sessionStartTime) / 1000);
    const rate = Math.round(this.cumulativeTokens / Math.max(duration, 1));

    return {
      total: this.cumulativeTokens,
      rate,
      duration
    };
  }

  disconnect(): void {
    if (this.activeWebSocket) {
      this.activeWebSocket.close();
      this.activeWebSocket = null;
    }
  }
}
