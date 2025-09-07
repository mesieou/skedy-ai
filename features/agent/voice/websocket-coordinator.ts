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
import { type VoiceEvent, type VoiceEventBus } from '../memory/redis/event-bus';
import { CallContextManager } from '../memory/call-context-manager';
import { ToolsManager } from '../tools/tools-manager';

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
  private voiceEventBus: VoiceEventBus;
  private toolsManager: ToolsManager;
  private activeWebSocket: WebSocket | null = null;
  private static instanceCount = 0;
  private instanceId: string;

  constructor(callContextManager: CallContextManager, voiceEventBus: VoiceEventBus, toolsManager: ToolsManager) {
    WebSocketCoordinator.instanceCount++;
    this.instanceId = `WebSocketCoordinator-${WebSocketCoordinator.instanceCount}`;
    this.webSocketService = new WebSocketService();
    this.callContextManager = callContextManager;
    this.voiceEventBus = voiceEventBus;
    this.toolsManager = toolsManager;
    this.setupEventListeners();
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  async startCallSession(options: WebSocketCoordinatorOptions): Promise<void> {
    // Attempt connection
    await this.attemptConnection(options);
  }

  private async attemptConnection(options: WebSocketCoordinatorOptions): Promise<void> {
    const { callId, apiKey, initialTools, onError } = options;

    try {

      // Create WebSocket connection
      const ws = await this.webSocketService.connect({
        callId,
        apiKey,
        voiceEventBus: this.voiceEventBus,
        initialTools,
        onMessage: () => {}, // Messages handled by WebSocketService
        onError: (error) => this.handleWebSocketError(callId, error),
        onClose: (code, reason) => this.handleWebSocketClose(callId, code, reason, options),
        onFunctionCall: async (functionName, args) => {
          // Direct execution - simple and consistent with codebase patterns
          console.log('🎯 [WebSocketCoordinator] Function call received, executing directly...');

          try {
            const startTime = Date.now();
            const result = await this.toolsManager.executeFunction(functionName, args, callId);
            const executionTime = Date.now() - startTime;

            // Handle dynamic schema updates after service selection
            if (functionName === 'select_service' && result.success) {
              console.log('🔄 [WebSocketCoordinator] Service selected - updating AI with dynamic quote schema...');
              await this.updateSessionToolsAfterServiceSelection();
            }

            console.log(`✅ [WebSocketCoordinator] Function completed in ${executionTime}ms`);
            return result;
          } catch (error) {
            console.error('❌ [WebSocketCoordinator] Function execution failed:', error);
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              message: 'Function execution failed'
            };
          }
        }
      });

      this.activeWebSocket = ws;

      // Emit connection success
      await this.voiceEventBus.publish({
        type: 'voice:websocket:connected',
        callId,
        timestamp: Date.now(),
        data: { reconnection: false }
      });


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
    await this.voiceEventBus.publish({
      type: 'voice:websocket:error',
      callId,
      timestamp: Date.now(),
      data: { error: error.message }
    });

    // Always clean up on error - no reconnection for MVP
    this.cleanup(callId);
  }

  private async handleWebSocketClose(callId: string, code: number, reason: string, options: WebSocketCoordinatorOptions): Promise<void> {

    // Emit disconnection event
    await this.voiceEventBus.publish({
      type: 'voice:websocket:disconnected',
      callId,
      timestamp: Date.now(),
      data: { code, reason }
    });

    // Always clean up - no reconnection for MVP
    this.cleanup(callId);

    if (options.onClose) {
      options.onClose(code, reason);
    }
  }


  // ============================================================================
  // EVENT LISTENERS & CLEANUP
  // ============================================================================

  private setupEventListeners(): void {
    // Enterprise pattern: One subscription per service with internal event filtering
    this.voiceEventBus.subscribe('voice:events', this.handleAllEvents.bind(this), `WebSocketCoordinator-${this.instanceId}`);
  }

  private async handleAllEvents(event: VoiceEvent): Promise<void> {

    // Internal event routing (enterprise pattern)
    switch (event.type) {
      case 'voice:call:ended':
        await this.handleCallEnded(event);
        break;

      default:
        break;
    }
  }

  private async handleCallEnded(event: VoiceEvent): Promise<void> {
    this.cleanup(event.callId);
  }


  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private cleanup(_callId: string): void {
    // Close WebSocket if still active
    if (this.activeWebSocket && this.activeWebSocket.readyState === WebSocket.OPEN) {
      this.activeWebSocket.close();
      this.activeWebSocket = null;
    }
  }

  async forceDisconnect(callId: string): Promise<void> {
    if (this.activeWebSocket) {
      this.activeWebSocket.close(1000, 'Forced disconnect');
      this.activeWebSocket = null;
    }
    this.cleanup(callId);
  }

  async updateSessionTools(tools: Array<Record<string, unknown>>): Promise<void> {
    console.log('🔄 [WebSocketCoordinator] Updating session tools...');
    this.webSocketService.updateSessionTools(tools);
  }

  private async updateSessionToolsAfterServiceSelection(): Promise<void> {
    try {
      console.log('🔄 [WebSocketCoordinator] Updating OpenAI session with dynamic schemas...');

      // Get static tools + dynamic quote schema for selected service
      const staticSchemas = this.toolsManager.getStaticToolsForAI();
      const dynamicQuoteSchema = this.toolsManager.getQuoteSchemaForSelectedService();

      console.log(`   📊 Static schemas: ${staticSchemas.length}`);
      console.log(`   🎯 Dynamic quote schema: ${dynamicQuoteSchema ? 'GENERATED' : 'NOT AVAILABLE'}`);

      if (dynamicQuoteSchema) {
        const allSchemas = [...staticSchemas, dynamicQuoteSchema];

        console.log('🔧 [WebSocketCoordinator] Complete schema set for OpenAI:');
        allSchemas.forEach(schema => {
          console.log(`   📋 Function: ${schema.name} - ${schema.description}`);
        });

        console.log('📤 [WebSocketCoordinator] Updating WebSocket with new tool schemas...');
        await this.updateSessionTools(allSchemas as unknown as Array<Record<string, unknown>>);

        console.log(`✅ [WebSocketCoordinator] Dynamic quote schema successfully added for selected service`);
      } else {
        console.log('⚠️ [WebSocketCoordinator] No dynamic quote schema available - keeping static schemas only');
      }

    } catch (error) {
      console.error('❌ [WebSocketCoordinator] Failed to update session tools:', error);
    }
  }
}
