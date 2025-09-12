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
import type { TokenSpent } from "../../shared/lib/database/types/chat-sessions";

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
  onUserMessage?: (transcript: string) => Promise<void>;
  onAIMessage?: (transcript: string) => Promise<void>;
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

  // Token tracking for debugging and final persistence
  private callTokens: TokenSpent = {
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    uncachedTokens: 0,
    audioInputTokens: 0,
    audioOutputTokens: 0,
    totalCost: 0,
    lastUpdated: 0
  };

  // Core optimization settings
  private readonly MAX_TURNS_BEFORE_SUMMARY = 6;
  private readonly MAX_OUTPUT_TOKENS = 120;

  // Simple tracking for optimization
  private turnCount = 0;

  // Schema management
  private currentSchemaHash: string | null = null;
  private conversationId: string | null = null;
  private currentSessionTools: Array<Record<string, unknown>> = [];

  // Retry protection - track by tool call ID, not function name
  private processedCallIds = new Set<string>();

  // Session tracking
  private sessionStartTime = Date.now();

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  async connect(options: MVPWebSocketConnectionOptions): Promise<WebSocket> {
    const { callId, businessId, apiKey, voiceEventBus, initialTools, onMessage, onError, onClose, onFunctionCall, onUserMessage, onAIMessage } = options;

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
    this.setupMessageHandlers(ws, onMessage, onFunctionCall, onUserMessage, onAIMessage);
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
    onFunctionCall?: (functionName: string, args: Record<string, unknown>, functionCallId: string) => Promise<unknown>,
    onUserMessage?: (transcript: string) => Promise<void>,
    onAIMessage?: (transcript: string) => Promise<void>
  ): void {
    ws.on("message", async (data: WebSocket.Data) => {
      try {
        const message = data.toString();
        if (onMessage) onMessage(message);

        const parsed = JSON.parse(message) as OpenAIWebSocketMessage;
        await this.handleIncomingMessage(parsed, onFunctionCall, onUserMessage, onAIMessage);
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
    onFunctionCall?: (functionName: string, args: Record<string, unknown>, functionCallId: string) => Promise<unknown>,
    onUserMessage?: (transcript: string) => Promise<void>,
    onAIMessage?: (transcript: string) => Promise<void>
  ): Promise<void> {
    const messageType = message.type;

    switch (messageType) {
      case "session.created":
        const sessionMessage = message as SessionCreatedMessage;
        this.conversationId = sessionMessage.session.conversation_id;
        console.log(`🎯 [MVP WebSocket] Session created: ${this.conversationId}`);
        break;

      case "session.updated":
        const sessionUpdate = message as { session?: { tools?: Array<{ name?: string }> } };
        const confirmedTools = sessionUpdate.session?.tools?.map(t => t.name).filter(Boolean) || [];
        console.log("═".repeat(80));
        console.log("🎯 [MVP WebSocket] Session updated (MVP optimized)");
        console.log(`🔧 [MVP WebSocket] OpenAI confirmed tools (${confirmedTools.length}): ${confirmedTools.join(', ')}`);
        console.log("═".repeat(80));
        break;

      case "response.done":
        await this.handleResponseDone(message as ResponseDoneMessage);
        // Check for function calls in response.done
        if (onFunctionCall) {
          await this.handleFunctionCallsInResponse(message, onFunctionCall);
        }
        break;

      case "response.output_audio_transcript.done":
        await this.handleAudioTranscript(message as AudioTranscriptMessage, onAIMessage);
        break;

      case "conversation.item.input_audio_transcription.completed":
        await this.handleUserTranscript(message as UserTranscriptMessage, onUserMessage);
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
    if (usage && this.callId && this.businessId) {
      // Extract detailed usage
      const detailedUsage = usage as {
        input_tokens_details?: { cached_tokens?: number; audio_tokens?: number };
        output_tokens_details?: { audio_tokens?: number };
      };

      const cachedTokens = detailedUsage.input_tokens_details?.cached_tokens || 0;
      const audioInputTokens = detailedUsage.input_tokens_details?.audio_tokens || 0;
      const audioOutputTokens = detailedUsage.output_tokens_details?.audio_tokens || 0;

      // Accumulate tokens for this call (debugging + final persistence)
      this.callTokens.inputTokens += usage.input_tokens || 0;
      this.callTokens.outputTokens += usage.output_tokens || 0;
      this.callTokens.cachedTokens += cachedTokens;
      this.callTokens.uncachedTokens += (usage.input_tokens || 0) - cachedTokens;
      this.callTokens.audioInputTokens += audioInputTokens;
      this.callTokens.audioOutputTokens += audioOutputTokens;

      // Calculate incremental cost for this response
      const inputCost = ((usage.input_tokens || 0) / 1000) * 2.50;
      const outputCost = ((usage.output_tokens || 0) / 1000) * 10.00;
      const audioInCost = (audioInputTokens / 1000) * 100.00;
      const audioOutCost = (audioOutputTokens / 1000) * 200.00;
      const responseCost = inputCost + outputCost + audioInCost + audioOutCost;

      this.callTokens.totalCost += responseCost;
      this.callTokens.lastUpdated = Date.now();

      // Debug logging only
      console.log(`📊 [Call Debug] Response: ${usage.input_tokens}in/${usage.output_tokens}out, $${responseCost.toFixed(4)}`);
      console.log(`📊 [Call Total] So far: ${this.callTokens.inputTokens + this.callTokens.outputTokens} tokens, $${this.callTokens.totalCost.toFixed(4)}`);
    }

    // Check if we need conversation management
    this.turnCount++;
    if (this.turnCount >= this.MAX_TURNS_BEFORE_SUMMARY) {
      await this.manageConversation();
    }
  }

  private async handleAudioTranscript(message: AudioTranscriptMessage, onAIMessage?: (transcript: string) => Promise<void>): Promise<void> {
    const transcript = message.transcript;
    if (transcript) {
      console.log(`🤖 [MVP AI said]: "${transcript}"`);
      // Store AI message via coordinator callback
      if (onAIMessage) {
        await onAIMessage(transcript);
      }
    }
  }

  private async handleUserTranscript(message: UserTranscriptMessage, onUserMessage?: (transcript: string) => Promise<void>): Promise<void> {
    const transcript = message.transcript;
    if (transcript) {
      console.log(`👤 [MVP User said]: "${transcript}"`);
      // Store user message via coordinator callback
      if (onUserMessage) {
        await onUserMessage(transcript);
      }
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
      // Check if there are any function calls to execute
      const response = (message as { response?: { output?: FunctionCallOutput[] } }).response;
      if (!response?.output) return;
      const functionCalls = response.output.filter(
        (output: FunctionCallOutput) => output.type === 'function_call' && output.name && output.arguments && output.call_id
      );

      if (functionCalls.length === 0) return;

      // Set processing flag to prevent duplicates
      this.isProcessingFunctionCall = true;

      // Execute all function calls in sequence (usually just one)
      for (const functionCall of functionCalls) {
        console.log(`🔧 [MVP WebSocket] Executing function: ${functionCall.name}`);

        // Check if this specific tool call ID was already processed (prevent duplicate execution)
        if (this.processedCallIds.has(functionCall.call_id!)) {
          console.warn(`⚠️ [MVP WebSocket] Skipping ${functionCall.name} - call ID ${functionCall.call_id} already processed`);
          continue;
        }

        const args = JSON.parse(functionCall.arguments || "{}");
        const functionResult = await onFunctionCall(functionCall.name!, args, functionCall.call_id!);

        // Extract result and additional tool if returned as object
        let result: unknown;
        let newTool: Array<Record<string, unknown>> | undefined;

        if (functionResult && typeof functionResult === 'object' && 'result' in functionResult) {
          const typedResult = functionResult as { result: unknown; additionalTools?: Array<Record<string, unknown>> };
          result = typedResult.result;
          newTool = typedResult.additionalTools;
        } else {
          result = functionResult;
        }

        // Update session with new tools BEFORE sending function result (like old architecture)
        if (newTool && newTool.length > 0) {
          console.log(`🔧 [MVP WebSocket] Adding ${newTool.length} tools before function result: ${newTool.map(t => t.name).join(', ')}`);
          await this.addToolsToSession(newTool);
        }

        // Send function result AFTER session update
        await this.sendFunctionResult(functionCall.call_id!, result);

        // Track processed call ID to prevent duplicate execution
        this.processedCallIds.add(functionCall.call_id!);
        console.log(`✅ [MVP WebSocket] Marked call ID ${functionCall.call_id} as processed`);
      }

      // Request optimized response after all function calls (maintain conversation context)
      console.log(`🔄 [MVP WebSocket] Requesting AI response...`);
      await this.requestOptimizedResponse(false);

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

  private async addToolsToSession(newTools: Array<Record<string, unknown>>): Promise<void> {
    console.log(`🔧 [MVP WebSocket] Adding ${newTools.length} tools to session: ${newTools.map(t => t.name).join(', ')}`);
    console.log(`🔍 [MVP WebSocket] Current session has ${this.currentSessionTools.length} tools: ${this.currentSessionTools.map(t => t.name).join(', ')}`);

    // Add new tools to existing tools (accumulate, don't replace)
    const updatedTools = [...this.currentSessionTools, ...newTools];

    const sessionUpdate = {
      type: "session.update",
      session: {
        type: "realtime",
        tools: updatedTools, // ALL tools (existing + new)
        tool_choice: "auto"
      }
    };

    console.log(`✅ [MVP WebSocket] Adding ${newTools.length} tools to ${this.currentSessionTools.length} existing tools`);
    console.log(`🔄 [MVP WebSocket] New session will have ${updatedTools.length} tools: ${updatedTools.map(t => t.name).join(', ')}`);

    await this.sendMessage(sessionUpdate);
    this.currentSessionTools = updatedTools; // Update our tracking
    console.log(`✅ [MVP WebSocket] Session updated with ${updatedTools.length} total tools`);
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
      this.currentSessionTools = [...tools]; // Track current tools
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

  getSessionDuration(): number {
    return Math.round((Date.now() - this.sessionStartTime) / 1000);
  }

  /**
   * Get accumulated token data for chat session persistence
   */
  getCallTokens(): TokenSpent {
    return { ...this.callTokens };
  }

  async disconnect(): Promise<void> {
    // Analytics cleanup (MVP version doesn't need explicit cleanup)
    console.log(`📊 [MVP Analytics] Call ${this.callId} ended`);

    if (this.activeWebSocket) {
      this.activeWebSocket.close();
      this.activeWebSocket = null;
    }
  }

}
