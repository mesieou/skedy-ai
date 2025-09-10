/**
 * MVP WebSocket Coordinator - Token Optimized
 *
 * Coordinates between WebSocket service and tools with:
 * - Smart schema updates (only when changed)
 * - Conversation stage tracking
 * - Token usage monitoring
 * - Business-aware coordination
 */

import { MVPWebSocketService } from './mvp-websocket-service';
import { MVPToolsManager } from '../tools/mvp-tools-manager';
import { MVPCallContextManager } from '../memory/mvp-call-context-manager';
import { type VoiceEventBus } from '../memory/redis/event-bus';
import { type FunctionCallResult } from '../tools/types';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface MVPCoordinatorOptions {
  maxOutputTokens: number;
  enableTruncation: boolean;
}

interface CallSessionOptions {
  callId: string;
  businessId: string;
  initialInstructions: string;
}

interface CallTrackingInfo {
  lastUpdate: Date;
  tokensUsed: number;
}

// ============================================================================
// MVP WEBSOCKET COORDINATOR
// ============================================================================

export class MVPWebSocketCoordinator {
  private readonly callContextManager: MVPCallContextManager;
  private readonly voiceEventBus: VoiceEventBus;
  private readonly toolsManager: MVPToolsManager;
  private readonly options: MVPCoordinatorOptions;

  private webSocketService: MVPWebSocketService | null = null;
  private activeCalls = new Map<string, CallTrackingInfo>();
  private isInitialized = false;

  constructor(
    callContextManager: MVPCallContextManager,
    voiceEventBus: VoiceEventBus,
    toolsManager: MVPToolsManager,
    options: MVPCoordinatorOptions
  ) {
    this.callContextManager = callContextManager;
    this.voiceEventBus = voiceEventBus;
    this.toolsManager = toolsManager;
    this.options = options;

    console.log('🔧 [MVP Coordinator] Initialized with options:', options);
  }

  // ============================================================================
  // CALL SESSION MANAGEMENT
  // ============================================================================

  async startCallSession(sessionOptions: CallSessionOptions): Promise<void> {
    const { callId, businessId } = sessionOptions;

    try {
      console.log(`🚀 [MVP Coordinator] Starting call session: ${callId}`);

      // Initialize WebSocket service
      this.webSocketService = new MVPWebSocketService();

      // Get initial tools (just knowledge + select_service)
      const initialTools = this.toolsManager.getInitialToolsForAI() as unknown as Array<Record<string, unknown>>;

      console.log(`🔧 [MVP Coordinator] Initial tools: ${initialTools.length}`);

      // Connect to OpenAI Realtime API
      await this.webSocketService.connect({
        callId,
        businessId,
        apiKey: process.env.OPENAI_API_KEY!,
        voiceEventBus: this.voiceEventBus,
        initialTools,
        onMessage: (message) => this.handleWebSocketMessage(callId, message),
        onError: (error) => this.handleWebSocketError(callId, error),
        onClose: (code, reason) => this.handleWebSocketClose(callId, code, reason),
        onFunctionCall: (functionName, args) =>
          this.handleFunctionCall(callId, functionName, args)
      });

      // Track call session
      this.activeCalls.set(callId, {
        lastUpdate: new Date(),
        tokensUsed: 0
      });

      console.log(`✅ [MVP Coordinator] Call session started: ${callId}`);

    } catch (error) {
      console.error(`❌ [MVP Coordinator] Failed to start call session ${callId}:`, error);
      throw error;
    }
  }

  async stopCallSession(callId: string): Promise<void> {
    try {
      console.log(`🛑 [MVP Coordinator] Stopping call session: ${callId}`);

      // Disconnect WebSocket
      if (this.webSocketService) {
        this.webSocketService.disconnect();
        this.webSocketService = null;
      }

      // Remove from active calls
      this.activeCalls.delete(callId);

      console.log(`✅ [MVP Coordinator] Call session stopped: ${callId}`);

    } catch (error) {
      console.error(`❌ [MVP Coordinator] Error stopping call session ${callId}:`, error);
    }
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  private handleWebSocketMessage(callId: string, message: string): void {
    // Log important messages for debugging
    try {
      const parsed = JSON.parse(message);

      if (parsed.type?.includes('error') || parsed.type?.includes('failed')) {
        console.error(`❌ [MVP Coordinator] WebSocket error for ${callId}:`, parsed);
      }

      // Update conversation tracking
      this.updateConversationStage(callId, parsed);

    } catch {
      // Ignore parsing errors for non-JSON messages
    }
  }

  private handleWebSocketError(callId: string, error: Error): void {
    console.error(`❌ [MVP Coordinator] WebSocket error for ${callId}:`, error.message);

    // Emit error event
    // Note: VoiceEventBus interface may need publishEvent method
    console.log(`📡 [MVP Coordinator] Error event for ${callId}: ${error.message}`);
  }

  private handleWebSocketClose(callId: string, code: number, reason: string): void {
    console.log(`🔌 [MVP Coordinator] WebSocket closed for ${callId}: ${code} - ${reason}`);

    // Clean up call session
    this.activeCalls.delete(callId);

    // Complete call context
    this.callContextManager.completeCall(callId, 'ended');
  }

  // ============================================================================
  // FUNCTION CALL HANDLING
  // ============================================================================

  private async handleFunctionCall(
    callId: string,
    functionName: string,
    args: Record<string, unknown>
  ): Promise<{ result: unknown; additionalTools?: Array<Record<string, unknown>> }> {
    try {
      console.log(`🔧 [MVP Coordinator] Function call: ${functionName} for ${callId}`);

      // Execute function through tools manager
      const result = await this.toolsManager.executeFunction(functionName, args);

      // Get additional tools if needed (e.g., after service selection)
      const additionalTools = await this.updateSchemasIfNeeded(functionName, result, callId);

      // Update call activity
      this.updateCallActivity(callId);

      return { result, additionalTools: additionalTools || undefined };

    } catch (error) {
      console.error(`❌ [MVP Coordinator] Function call error for ${callId}:`, error);

      return {
        result: {
          success: false,
          error: 'Function execution failed',
          message: 'Sorry, I encountered an error processing that request. Please try again.'
        }
      };
    }
  }

  // ============================================================================
  // SMART SCHEMA MANAGEMENT
  // ============================================================================

  private async updateSchemasIfNeeded(functionName: string, result: FunctionCallResult, callId: string): Promise<Array<Record<string, unknown>> | null> {
    if (!this.webSocketService) {
      return null;
    }

    let newToolsToAdd: Array<Record<string, unknown>> = [];

    try {
      // Progressive tool addition - only add tools needed for next step
      switch (functionName) {
        case 'select_service':
          if (result.success) {
            // Add get_quote for selected service
            const quoteSchema = await this.toolsManager.getDynamicQuoteSchema();
            if (quoteSchema) {
              newToolsToAdd = [quoteSchema] as unknown as Array<Record<string, unknown>>;
              console.log(`🔄 [MVP Coordinator] Adding get_quote after service selection`);
            }
          }
          break;

        case 'get_quote':
          if (result.success) {
            const allQuotes = await this.callContextManager.getAllQuotes(callId);

            if (allQuotes.length === 1) {
              // First quote - add check_day_availability
              const availabilitySchema = this.toolsManager.getStaticToolsForAI().find(tool => tool.name === 'check_day_availability');
              if (availabilitySchema) {
                newToolsToAdd = [availabilitySchema] as unknown as Array<Record<string, unknown>>;
                console.log(`🔄 [MVP Coordinator] Adding check_day_availability after 1st quote`);
              }
            } else if (allQuotes.length >= 2) {
              // Second+ quote - add select_quote
              const quoteSelectionSchema = this.toolsManager.getQuoteSelectionSchema();
              if (quoteSelectionSchema) {
                newToolsToAdd = [quoteSelectionSchema] as unknown as Array<Record<string, unknown>>;
                console.log(`🔄 [MVP Coordinator] Adding select_quote after ${allQuotes.length} quotes`);
              }
            }
          }
          break;
        case 'check_day_availability':
          if (result.success) {
            // Add check_user_exists
            const userCheckSchema = this.toolsManager.getStaticToolsForAI().find(tool => tool.name === 'check_user_exists');
            if (userCheckSchema) {
              newToolsToAdd = [userCheckSchema] as unknown as Array<Record<string, unknown>>;
              console.log(`🔄 [MVP Coordinator] Adding check_user_exists after availability check`);
            }
          }
          break;
        case 'check_user_exists':
          if (result.success) {
            // Add both create_user and create_booking (AI needs both options)
            const createUserSchema = this.toolsManager.getStaticToolsForAI().find(tool => tool.name === 'create_user');
            const createBookingSchema = this.toolsManager.getStaticToolsForAI().find(tool => tool.name === 'create_booking');

            if (createUserSchema && createBookingSchema) {
              newToolsToAdd = [createUserSchema, createBookingSchema] as unknown as Array<Record<string, unknown>>;
              console.log(`🔄 [MVP Coordinator] Adding create_user and create_booking after user check`);
            }
          }
          break;
      }

      return newToolsToAdd.length > 0 ? newToolsToAdd : null;

    } catch (error) {
      console.error(`❌ [MVP Coordinator] Error preparing progressive tools:`, error);
      return null;
    }
  }

  // ============================================================================
  // CONVERSATION STAGE TRACKING
  // ============================================================================

  private updateConversationStage(callId: string, message: Record<string, unknown>): void {
    const callInfo = this.activeCalls.get(callId);
    if (!callInfo) {
      return;
    }

    // Update token usage if available
    const messageWithUsage = message as { response?: { usage?: { total_tokens?: number } } };
    if (messageWithUsage.response?.usage?.total_tokens) {
      callInfo.tokensUsed += messageWithUsage.response.usage.total_tokens;
    }

    // Update last activity
    callInfo.lastUpdate = new Date();

    this.activeCalls.set(callId, callInfo);
  }

  // Simplified: Just update activity timestamp
  private updateCallActivity(callId: string): void {
    const callInfo = this.activeCalls.get(callId);
    if (callInfo) {
      callInfo.lastUpdate = new Date();
      this.activeCalls.set(callId, callInfo);
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getCallActivity(callId: string): Date | null {
    const callInfo = this.activeCalls.get(callId);
    return callInfo?.lastUpdate || null;
  }

  getTokenUsage(callId: string): { total: number; rate: number } | null {
    const callInfo = this.activeCalls.get(callId);
    if (!callInfo) {
      return null;
    }

    const duration = (Date.now() - callInfo.lastUpdate.getTime()) / 1000;
    const rate = duration > 0 ? Math.round(callInfo.tokensUsed / duration) : 0;

    return {
      total: callInfo.tokensUsed,
      rate
    };
  }

  getActiveCalls(): string[] {
    return Array.from(this.activeCalls.keys());
  }

  getCallInfo(callId: string): CallTrackingInfo | null {
    return this.activeCalls.get(callId) || null;
  }

  // ============================================================================
  // HEALTH & DIAGNOSTICS
  // ============================================================================

  async getHealthStatus(): Promise<{
    activeCalls: number;
    totalTokensUsed: number;
    averageTokenRate: number;
    isHealthy: boolean;
  }> {
    const activeCalls = this.activeCalls.size;
    let totalTokens = 0;
    let totalDuration = 0;

    for (const [, info] of this.activeCalls) {
      totalTokens += info.tokensUsed;
      totalDuration += (Date.now() - info.lastUpdate.getTime()) / 1000;
    }

    const averageRate = totalDuration > 0 ? Math.round(totalTokens / totalDuration) : 0;
    const isHealthy = averageRate < 500; // Under 500 tokens/sec is healthy

    return {
      activeCalls,
      totalTokensUsed: totalTokens,
      averageTokenRate: averageRate,
      isHealthy
    };
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  async shutdown(): Promise<void> {
    console.log('🛑 [MVP Coordinator] Shutting down coordinator');

    // Stop all active call sessions
    const activeCallIds = Array.from(this.activeCalls.keys());
    for (const callId of activeCallIds) {
      await this.stopCallSession(callId);
    }

    // Disconnect WebSocket
    if (this.webSocketService) {
      this.webSocketService.disconnect();
      this.webSocketService = null;
    }

    this.activeCalls.clear();
    console.log('✅ [MVP Coordinator] Shutdown complete');
  }
}
