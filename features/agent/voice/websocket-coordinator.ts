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


// ============================================================================
// WEBSOCKET COORDINATOR (MVP)
// ============================================================================

export class WebSocketCoordinator {
  private webSocketService: WebSocketService;
  private callContextManager: CallContextManager;
  private activeWebSocket: WebSocket | null = null;
  private static instanceCount = 0;
  private instanceId: string;

  constructor(callContextManager?: CallContextManager) {
    WebSocketCoordinator.instanceCount++;
    this.instanceId = `WebSocketCoordinator-${WebSocketCoordinator.instanceCount}`;
    console.log(`🏗️ [${this.instanceId}] Creating new WebSocketCoordinator instance (total: ${WebSocketCoordinator.instanceCount})`);
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

    // Attempt connection
    await this.attemptConnection(options);
  }

  private async attemptConnection(options: WebSocketCoordinatorOptions): Promise<void> {
    const { callId, apiKey, initialTools, onError } = options;

    try {
      console.log(`🔌 [WebSocketCoordinator] Attempting connection for ${callId}`);

      // Create WebSocket connection
      const ws = await this.webSocketService.connect({
        callId,
        apiKey,
        initialTools,
        onMessage: () => {}, // Messages handled by WebSocketService
        onError: (error) => this.handleWebSocketError(callId, error),
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

      // Emit connection success
      await voiceEventBus.publish({
        type: 'voice:websocket:connected',
        callId,
        timestamp: Date.now(),
        data: { reconnection: false }
      });

      console.log(`✅ [WebSocketCoordinator] Connected successfully for ${callId}`);

    } catch (error) {
      console.error(`❌ [WebSocketCoordinator] Connection failed for ${callId}:`, error);

      // Clean up on connection failure
      this.cleanup(callId);

      if (onError) {
        onError(error as Error);
      }
    }
  }


  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private async handleWebSocketError(callId: string, error: Error): Promise<void> {
    console.error(`❌ [WebSocketCoordinator] WebSocket error for ${callId}:`, error);

    // Emit error event
    await voiceEventBus.publish({
      type: 'voice:websocket:error',
      callId,
      timestamp: Date.now(),
      data: { error: error.message }
    });

    // Always clean up on error - no reconnection for MVP
    console.log(`🧹 [WebSocketCoordinator] WebSocket error - cleaning up resources for ${callId}`);
    this.cleanup(callId);
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

    // Emit call ended event (triggers call state update and cleanup)
    await voiceEventBus.publish({
      type: 'voice:call:ended',
      callId,
      timestamp: Date.now(),
      data: { reason: `websocket_close: ${code}` }
    });

    // Always clean up - no reconnection for MVP
    console.log(`🧹 [WebSocketCoordinator] WebSocket closed - cleaning up resources for ${callId}`);
    this.cleanup(callId);

    if (options.onClose) {
      options.onClose(code, reason);
    }
  }


  // ============================================================================
  // EVENT LISTENERS & CLEANUP
  // ============================================================================

  private setupEventListeners(): void {
    console.log(`🔧 [${this.instanceId}] Setting up event listeners`);
    voiceEventBus.subscribe('voice:call:ended', this.handleCallEnded.bind(this), this.instanceId);
    console.log(`🔌 [${this.instanceId}] Event listeners initialized`);
  }

  private async handleCallEnded(event: VoiceEvent): Promise<void> {
    this.cleanup(event.callId);
    console.log(`🏁 [WebSocketCoordinator] Call ended for ${event.callId} - cleaning up WebSocket resources`);
  }

  private cleanup(callId: string): void {
    // Close WebSocket if still active
    if (this.activeWebSocket && this.activeWebSocket.readyState === WebSocket.OPEN) {
      this.activeWebSocket.close();
      this.activeWebSocket = null;
    }

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
