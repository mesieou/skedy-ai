/**
 * Call Context Manager
 *
 * Single source of truth coordination hub for call-specific data:
 * - Redis short-term memory (call state, conversation messages)
 * - Postgres long-term persistence (chat sessions)
 * - Event-driven coordination between services
 * - Fallback strategies when Redis fails
 *
 * NOTE: Does NOT handle business context (that's cached separately)
 */

import { CallStateManager, type CallState, type CallStateUpdate } from './short-term/call-state-manager';
import { RealTimeConversationManager, type ConversationMessage } from './short-term/conversation-manager';
import { ConversationPersistenceService } from './long-term/conversation-persistence';
import { voiceEventBus, type VoiceEvent } from './redis/event-bus';
import { simpleTTL } from './redis/simple-ttl';
import { agentServiceContainer } from './service-container';
import type { User } from '../../shared/lib/database/types/user';
import type { Business } from '../../shared/lib/database/types/business';
import type { Service } from '../../shared/lib/database/types/service';
import type { BookingCalculationInput, BookingCalculationResult } from '../../scheduling/lib/types/booking-calculations';

// ============================================================================
// TYPES
// ============================================================================

export interface CallContext {
  callId: string;
  businessId: string;
  userId: string | null;
  chatSessionId: string | null;
  phoneNumber: string;
  user: User | null;
  business: Business;
  callState: CallState;
}

export interface MessageContext {
  callId: string;
  message: ConversationMessage;
  messageCount: number;
  recentMessages: ConversationMessage[];
}

// ============================================================================
// CONTEXT MANAGER
// ============================================================================

export class CallContextManager {
  private callStateManager: CallStateManager;
  private realTimeConversationManager: RealTimeConversationManager;
  private conversationPersistenceService: ConversationPersistenceService;
  private instanceId: string;
  private static instanceCount = 0;

  constructor() {
    CallContextManager.instanceCount++;
    this.instanceId = `CallContextManager-${CallContextManager.instanceCount}`;
    console.log(`🏗️ [${this.instanceId}] Creating new CallContextManager instance (total: ${CallContextManager.instanceCount})`);
    // Create per-call services (stateful)
    this.callStateManager = agentServiceContainer.createCallStateManager();
    this.realTimeConversationManager = agentServiceContainer.createRealTimeConversationManager();

    // Get shared service (stateless, handles all calls)
    this.conversationPersistenceService = agentServiceContainer.getConversationPersistenceService();

    this.setupEventListeners();
  }

  // ============================================================================
  // CALL LIFECYCLE MANAGEMENT
  // ============================================================================

  async initializeCall(callData: {
    callId: string;
    businessId: string;
    userId: string | null;
    phoneNumber: string;
    user: User | null;
    business: Business;
  }): Promise<CallContext> {
    console.log(`🎯 [Context] Initializing call context for ${callData.callId}`);

    // Create call state in Redis
    const callState = await this.callStateManager.createCallState({
      callId: callData.callId,
      businessId: callData.businessId,
      userId: callData.userId,
      phoneNumber: callData.phoneNumber
    });

    // Emit call started event
    await voiceEventBus.publish({
      type: 'voice:call:started',
      callId: callData.callId,
      timestamp: Date.now(),
      data: {
        phoneNumber: callData.phoneNumber,
        businessId: callData.businessId,
        twilioAccountSid: 'extracted_from_webhook',
        user: callData.user,
        isReturningCustomer: callData.user !== null
      }
    });

    const callContext: CallContext = {
      ...callData,
      chatSessionId: null, // Will be set when chat session is created
      callState
    };

    console.log(`✅ [Context] Call context initialized for ${callData.callId}`);
    return callContext;
  }

  async updateCallState(callId: string, updates: CallStateUpdate): Promise<CallState | null> {
    const updatedState = await this.callStateManager.updateCallState(callId, updates);

    if (updatedState) {
      // Emit state change event
      await voiceEventBus.publish({
        type: 'voice:call:state_changed',
        callId,
        timestamp: Date.now(),
        data: { updates, newState: updatedState }
      });
    }

    return updatedState;
  }


  // ============================================================================
  // MESSAGE MANAGEMENT
  // ============================================================================

  async addUserMessage(callId: string, content: string, openai_item_id?: string): Promise<ConversationMessage> {
    const message = this.realTimeConversationManager.createUserMessage(content, openai_item_id);
    const storedMessage = await this.realTimeConversationManager.addMessage(callId, message);

    // Update call activity
    await this.updateCallState(callId, { lastActivity: Date.now() });

    // Emit message event for long-term persistence
    await voiceEventBus.publish({
      type: 'voice:message:user',
      callId,
      timestamp: Date.now(),
      data: {
        content,
        openai_item_id,
        messageId: storedMessage.id
      }
    });

    return storedMessage;
  }

  async addAssistantMessage(callId: string, content: string, openai_item_id?: string): Promise<ConversationMessage> {
    const message = this.realTimeConversationManager.createAssistantMessage(content, openai_item_id);
    const storedMessage = await this.realTimeConversationManager.addMessage(callId, message);

    // Update call activity
    await this.updateCallState(callId, { lastActivity: Date.now() });

    // Emit message event for long-term persistence
    await voiceEventBus.publish({
      type: 'voice:message:assistant',
      callId,
      timestamp: Date.now(),
      data: {
        content,
        openai_item_id,
        messageId: storedMessage.id
      }
    });

    return storedMessage;
  }

  async addSystemMessage(callId: string, content: string): Promise<ConversationMessage> {
    const message = this.realTimeConversationManager.createSystemMessage(content);
    const storedMessage = await this.realTimeConversationManager.addMessage(callId, message);

    // Emit system message event
    await voiceEventBus.publish({
      type: 'voice:message:system',
      callId,
      timestamp: Date.now(),
      data: {
        content,
        messageId: storedMessage.id
      }
    });

    return storedMessage;
  }

  async getRecentMessages(callId: string, limit: number = 50): Promise<ConversationMessage[]> {
    return await this.realTimeConversationManager.getRecentMessages(callId, limit);
  }

  // ============================================================================
  // BOOKING DATA MANAGEMENT
  // ============================================================================

  async updateBookingInput(callId: string, bookingInput: Partial<BookingCalculationInput>): Promise<void> {
    await this.callStateManager.updateBookingInput(callId, bookingInput);

    // Emit booking data update event
    await voiceEventBus.publish({
      type: 'voice:booking:data_updated',
      callId,
      timestamp: Date.now(),
      data: { bookingInput }
    });
  }

  async setQuoteData(callId: string, quoteData: BookingCalculationResult): Promise<void> {
    await this.callStateManager.setQuoteData(callId, quoteData);

    // Add system message about quote generation
    await this.addSystemMessage(callId, `Quote generated: AUD ${quoteData.total_estimate_amount}`);

    // Emit quote generated event
    await voiceEventBus.publish({
      type: 'voice:quote:generated',
      callId,
      timestamp: Date.now(),
      data: { quoteData }
    });
  }

  async getBookingInput(callId: string): Promise<Partial<BookingCalculationInput> | null> {
    return await this.callStateManager.getBookingInput(callId);
  }

  // ============================================================================
  // SERVICE & TOOL MANAGEMENT
  // ============================================================================

  async setSelectedService(callId: string, service: Service): Promise<void> {
    await this.updateCallState(callId, {
      selectedService: service,
      toolsAvailable: ['select_service', 'get_quote'] // Quote becomes available
    });

    // Add system message about service selection
    await this.addSystemMessage(callId, `Service selected: ${service.name}`);

    console.log(`🎯 [Context] Service selected for ${callId}: ${service.name}`);
  }

  async updateAvailableTools(callId: string, tools: string[]): Promise<void> {
    await this.updateCallState(callId, { toolsAvailable: tools });
    console.log(`🔧 [Context] Updated tools for ${callId}:`, tools);
  }

  // ============================================================================
  // CONTEXT RETRIEVAL
  // ============================================================================

  async getCallContext(callId: string): Promise<CallContext | null> {
    const callState = await this.callStateManager.getCallState(callId);
    if (!callState) return null;

    // TODO: Reconstruct full call context from Redis + cached data
    // For now, return minimal context
    return {
      callId,
      businessId: callState.businessId,
      userId: callState.userId,
      chatSessionId: callState.chatSessionId,
      phoneNumber: callState.phoneNumber,
      user: null, // TODO: Get from cache or database
      business: {} as Business, // TODO: Get from cache or database
      callState
    };
  }

  async getChatSessionId(callId: string): Promise<string | null> {
    const sessionInfo = await this.conversationPersistenceService.getPendingSessionInfo(callId);
    return sessionInfo?.chatSessionId || null;
  }

  async setChatSessionId(callId: string, chatSessionId: string): Promise<void> {
    await this.updateCallState(callId, { lastActivity: Date.now() });

    // Store chat session ID in call state
    const callState = await this.callStateManager.getCallState(callId);
    if (callState) {
      callState.chatSessionId = chatSessionId;
      await this.callStateManager.updateCallState(callId, { lastActivity: Date.now() });
    }

    console.log(`📋 [CallContext] Chat session linked to call ${callId}: ${chatSessionId}`);
  }

  // ============================================================================
  // CALL LIFECYCLE MANAGEMENT
  // ============================================================================

  async endCall(callId: string, reason: string): Promise<void> {
    try {
      // Update call state to ended
      await this.updateCallState(callId, {
        status: 'ended',
        lastActivity: Date.now()
      });

      // Set TTL for cleanup (1 hour)
      await simpleTTL.setEndedCallTTL(callId);

      // Emit call ended event
      await voiceEventBus.publish({
        type: 'voice:call:ended',
        callId,
        timestamp: Date.now(),
        data: { reason }
      });

      console.log(`🏁 [CallContext] Ending call ${callId} (reason: ${reason})`);
      console.log(`✅ [CallContext] Call ended and TTL set for ${callId}`);
    } catch (error) {
      console.error(`❌ [CallContext] Failed to end call ${callId}:`, error);
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private setupEventListeners(): void {
    // Listen for WebSocket connection events
    console.log(`🔧 [${this.instanceId}] Setting up event listeners`);
    voiceEventBus.subscribe('voice:websocket:connected', this.handleWebSocketConnected.bind(this), this.instanceId);
    voiceEventBus.subscribe('voice:websocket:disconnected', this.handleWebSocketDisconnected.bind(this), this.instanceId);
    voiceEventBus.subscribe('voice:call:ended', this.handleCallEndedEvent.bind(this), this.instanceId);
  }

  private async handleWebSocketConnected(event: VoiceEvent): Promise<void> {
    console.log(`🔌 [${this.instanceId}] Handling WebSocket connected event for call ${event.callId}`);
    await this.updateCallState(event.callId, {
      webSocketStatus: 'connected',
      lastActivity: Date.now()
    });
  }

  private async handleWebSocketDisconnected(event: VoiceEvent): Promise<void> {
    console.log(`🔌 [${this.instanceId}] Handling WebSocket disconnected event for call ${event.callId}`);
    await this.updateCallState(event.callId, {
      webSocketStatus: 'disconnected'
    });
  }

  private async handleCallEndedEvent(event: VoiceEvent): Promise<void> {
    console.log(`🏁 [${this.instanceId}] Handling call ended event for call ${event.callId}`);

    // Update call state to ended (this replaces the direct endCall method)
    await this.updateCallState(event.callId, {
      status: 'ended',
      lastActivity: Date.now()
    });

    // Set TTL for cleanup (1 hour)
    await simpleTTL.setEndedCallTTL(event.callId);

    console.log(`✅ [${this.instanceId}] Call ended and TTL set for ${event.callId}`);
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private async getCallStartTime(callId: string): Promise<number> {
    const state = await this.callStateManager.getCallState(callId);
    return state?.startedAt || Date.now();
  }

  async getActiveCallsCount(): Promise<number> {
    return await this.callStateManager.getActiveCallsCount();
  }

  async getCallSummary(callId: string): Promise<{
    exists: boolean;
    status?: string;
    duration?: number;
    messageCount?: number;
    hasQuote?: boolean;
    lastActivity?: number;
    hasUserMessages?: boolean;
    hasAssistantMessages?: boolean;
  }> {
    const callSummary = await this.callStateManager.getCallStateSummary(callId);
    const conversationSummary = await this.realTimeConversationManager.getConversationSummary(callId);

    return {
      ...callSummary,
      ...conversationSummary
    };
  }
}
