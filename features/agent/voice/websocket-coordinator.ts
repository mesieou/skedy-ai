/**
 * WebSocket Coordinator (MVP)
 *
 * Quality voice agent WebSocket management with:
 * - Auto-reconnection for seamless customer experience
 * - State restoration from Redis (conversation + booking data)
 * - Simple, reliable, focused on voice call quality
 */

import WebSocket from 'ws';
import { WebSocketService } from './websocket-service';
import { voiceEventBus, type VoiceEvent } from '../memory/redis/event-bus';
import { CallContextManager } from '../memory/call-context-manager';

// ============================================================================
// TYPES
// ============================================================================

export interface WebSocketCoordinatorOptions {
  callId: string;
  apiKey: string;
  initialTools?: Array<Record<string, unknown>>;
  onError?: (error: Error) => void;
  onClose?: (code: number, reason: string) => void;
}

interface ReconnectionState {
  attempts: number;
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  isReconnecting: boolean;
}

// ============================================================================
// WEBSOCKET COORDINATOR (MVP)
// ============================================================================

export class WebSocketCoordinator {
  private webSocketService: WebSocketService;
  private callContextManager: CallContextManager;
  private activeWebSocket: WebSocket | null = null;

  // Reconnection management (simplified)
  private reconnectionState: Map<string, ReconnectionState> = new Map();
  private reconnectionTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(callContextManager?: CallContextManager) {
    this.webSocketService = new WebSocketService();
    this.callContextManager = callContextManager || new CallContextManager();
    this.setupEventListeners();
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  async startCallSession(options: WebSocketCoordinatorOptions): Promise<void> {
    const { callId } = options;
    console.log(`🔌 [WebSocketCoordinator] Starting session for call ${callId}`);

    // Initialize reconnection state
    this.initializeReconnectionState(callId);

    // Attempt initial connection
    await this.attemptConnection(options);
  }

  private async attemptConnection(options: WebSocketCoordinatorOptions): Promise<void> {
    const { callId, apiKey, initialTools, onError } = options;

    try {
      this.updateReconnectionAttempt(callId);
      console.log(`🔌 [WebSocketCoordinator] Attempting connection for ${callId}`);

      // Create WebSocket connection
      const ws = await this.webSocketService.connect({
        callId,
        apiKey,
        initialTools,
        onMessage: () => {}, // Messages handled by WebSocketService
        onError: (error) => this.handleWebSocketError(callId, error, options),
        onClose: (code, reason) => this.handleWebSocketClose(callId, code, reason, options),
        onFunctionCall: async (functionName, args, functionCallId) => {
          // Forward to webhook handler via events
          await voiceEventBus.publish({
            type: 'voice:function:called',
            callId,
            timestamp: Date.now(),
            data: { functionName, args, functionCallId }
          });
          return { success: true, message: 'Function call forwarded' };
        }
      });

      this.activeWebSocket = ws;
      this.resetReconnectionState(callId);

      // Restore state if this was a reconnection
      const reconnectState = this.getReconnectionState(callId);
      if (reconnectState && reconnectState.attempts > 1) {
        await this.restoreStateFromRedis(callId);
      }

      // Emit connection success
      await voiceEventBus.publish({
        type: 'voice:websocket:connected',
        callId,
        timestamp: Date.now(),
        data: { reconnection: (reconnectState?.attempts || 0) > 1 }
      });

      console.log(`✅ [WebSocketCoordinator] Connected successfully for ${callId}`);

    } catch (error) {
      console.error(`❌ [WebSocketCoordinator] Connection failed for ${callId}:`, error);
      await this.scheduleReconnection(callId, options);

      if (onError) {
        onError(error as Error);
      }
    }
  }

  // ============================================================================
  // AUTO-RECONNECTION (Quality Voice Agent Feature)
  // ============================================================================

  private async scheduleReconnection(callId: string, options: WebSocketCoordinatorOptions): Promise<void> {
    const state = this.getReconnectionState(callId);
    if (!state || state.attempts >= state.maxAttempts) {
      console.error(`❌ [WebSocketCoordinator] Max reconnection attempts exceeded for ${callId}`);
      return;
    }

    // Simple exponential backoff (1s, 2s, 4s, 8s, max 10s)
    const delay = Math.min(state.baseDelayMs * Math.pow(2, state.attempts), state.maxDelayMs);

    console.log(`🔄 [WebSocketCoordinator] Reconnecting ${callId} in ${delay}ms (attempt ${state.attempts + 1})`);

    const timer = setTimeout(() => {
      this.attemptConnection(options);
    }, delay);

    this.reconnectionTimers.set(callId, timer);
    state.isReconnecting = true;
  }

  // ============================================================================
  // STATE RESTORATION (Quality Voice Agent Feature)
  // ============================================================================

  private async restoreStateFromRedis(callId: string): Promise<void> {
    try {
      console.log(`🔄 [WebSocketCoordinator] Restoring conversation state for ${callId}`);

      // Get recent messages for context
      const recentMessages = await this.callContextManager.getRecentMessages(callId, 5);

      if (recentMessages.length > 0) {
        // Add system message about reconnection with context
        const lastUserMessage = recentMessages.filter(m => m.role === 'user').pop();
        const contextHint = lastUserMessage ? ` We were discussing: "${lastUserMessage.content.substring(0, 50)}..."` : '';

        await this.callContextManager.addSystemMessage(
          callId,
          `Connection restored.${contextHint}`
        );

        console.log(`✅ [WebSocketCoordinator] State restored with ${recentMessages.length} messages`);
      }

    } catch (error) {
      console.error(`❌ [WebSocketCoordinator] Failed to restore state for ${callId}:`, error);
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private async handleWebSocketError(callId: string, error: Error, options: WebSocketCoordinatorOptions): Promise<void> {
    console.error(`❌ [WebSocketCoordinator] WebSocket error for ${callId}:`, error);

    // Emit error event
    await voiceEventBus.publish({
      type: 'voice:websocket:error',
      callId,
      timestamp: Date.now(),
      data: { error: error.message }
    });

    await this.scheduleReconnection(callId, options);
  }

  private async handleWebSocketClose(callId: string, code: number, reason: string, options: WebSocketCoordinatorOptions): Promise<void> {
    console.log(`🔌 [WebSocketCoordinator] WebSocket closed for ${callId} - Code: ${code}, Reason: ${reason}`);

    // Emit disconnection event
    await voiceEventBus.publish({
      type: 'voice:websocket:disconnected',
      callId,
      timestamp: Date.now(),
      data: { code, reason }
    });

    // Only reconnect if it wasn't a normal closure
    if (code !== 1000) {
      await this.scheduleReconnection(callId, options);
    } else {
      this.cleanup(callId);
    }

    if (options.onClose) {
      options.onClose(code, reason);
    }
  }

  // ============================================================================
  // STATE MANAGEMENT (Simplified)
  // ============================================================================

  private initializeReconnectionState(callId: string): void {
    this.reconnectionState.set(callId, {
      attempts: 0,
      maxAttempts: 5, // 5 attempts max
      baseDelayMs: 1000, // Start with 1 second
      maxDelayMs: 10000, // Max 10 seconds
      isReconnecting: false
    });
  }

  private updateReconnectionAttempt(callId: string): void {
    const state = this.reconnectionState.get(callId);
    if (state) {
      state.attempts++;
    }
  }

  private resetReconnectionState(callId: string): void {
    const state = this.reconnectionState.get(callId);
    if (state) {
      state.attempts = 0;
      state.isReconnecting = false;
    }
  }

  private getReconnectionState(callId: string): ReconnectionState | undefined {
    return this.reconnectionState.get(callId);
  }

  // ============================================================================
  // EVENT LISTENERS & CLEANUP
  // ============================================================================

  private setupEventListeners(): void {
    voiceEventBus.subscribe('voice:call:ended', this.handleCallEnded.bind(this));
    console.log('🔌 [WebSocketCoordinator] Event listeners initialized');
  }

  private async handleCallEnded(event: VoiceEvent): Promise<void> {
    this.cleanup(event.callId);
    console.log(`🏁 [WebSocketCoordinator] Call ended for ${event.callId} - cleaning up WebSocket resources`);
  }

  private cleanup(callId: string): void {
    // Clear reconnection timer
    const timer = this.reconnectionTimers.get(callId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectionTimers.delete(callId);
    }

    // Clean up state
    this.reconnectionState.delete(callId);

    console.log(`🧹 [WebSocketCoordinator] Cleaned up resources for ${callId}`);
  }

  async forceDisconnect(callId: string): Promise<void> {
    if (this.activeWebSocket) {
      this.activeWebSocket.close(1000, 'Forced disconnect');
      this.activeWebSocket = null;
    }
    this.cleanup(callId);
  }
}
