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
import { type VoiceEvent, type VoiceEventBus } from './redis/event-bus';
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
  private voiceEventBus: VoiceEventBus;
  private instanceId: string;
  private static instanceCount = 0;

  constructor(voiceEventBus: VoiceEventBus) {
    CallContextManager.instanceCount++;
    this.instanceId = `CallContextManager-${CallContextManager.instanceCount}`;

    // Inject event bus dependency
    this.voiceEventBus = voiceEventBus;

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
    businessPhoneNumber: string;
    user: User | null;
    business: Business;
  }): Promise<CallContext> {

    // Create call state in Redis
    const callState = await this.callStateManager.createCallState({
      callId: callData.callId,
      businessId: callData.businessId,
      userId: callData.userId,
      phoneNumber: callData.phoneNumber
    });

    // Emit call started event
    await this.voiceEventBus.publish({
      type: 'voice:call:started',
      callId: callData.callId,
      timestamp: Date.now(),
      data: {
        phoneNumber: callData.phoneNumber,
        businessId: callData.businessId,
        businessPhoneNumber: callData.businessPhoneNumber,
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

    return callContext;
  }

  async updateCallState(callId: string, updates: CallStateUpdate): Promise<CallState | null> {
    const updatedState = await this.callStateManager.updateCallState(callId, updates);

    if (updatedState) {
      // Only publish events for meaningful state changes (not lastActivity updates)
      const meaningfulUpdates = { ...updates };
      delete meaningfulUpdates.lastActivity;

      if (Object.keys(meaningfulUpdates).length > 0) {
        await this.voiceEventBus.publish({
          type: 'voice:call:state_changed',
          callId,
          timestamp: Date.now(),
          data: { updates: meaningfulUpdates, newState: updatedState }
        });
      }
    }

    return updatedState;
  }


  // ============================================================================
  // MESSAGE MANAGEMENT
  // ============================================================================

  async addUserMessage(callId: string, content: string, openai_item_id?: string): Promise<ConversationMessage> {
    const message = this.realTimeConversationManager.createUserMessage(content, openai_item_id);
    const storedMessage = await this.realTimeConversationManager.addMessage(callId, message);

    // Log user message with phone number
    const callState = await this.callStateManager.getCallState(callId);
    if (callState) {
    }

    // Update call activity
    await this.updateCallState(callId, { lastActivity: Date.now() });

    return storedMessage;
  }

  async addAssistantMessage(callId: string, content: string, openai_item_id?: string): Promise<ConversationMessage> {
    const message = this.realTimeConversationManager.createAssistantMessage(content, openai_item_id);
    const storedMessage = await this.realTimeConversationManager.addMessage(callId, message);

    // Log agent message

    // Update call activity
    await this.updateCallState(callId, { lastActivity: Date.now() });

    return storedMessage;
  }

  async addSystemMessage(callId: string, content: string): Promise<ConversationMessage> {
    const message = this.realTimeConversationManager.createSystemMessage(content);
    const storedMessage = await this.realTimeConversationManager.addMessage(callId, message);

    // Emit system message event
    await this.voiceEventBus.publish({
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
    await this.voiceEventBus.publish({
      type: 'voice:booking:data_updated',
      callId,
      timestamp: Date.now(),
      data: { bookingInput }
    });
  }

  /**
   * Update user context when user is created (publishes event)
   */
  async updateUserContext(callId: string, user: User): Promise<void> {
    await this.callStateManager.updateCallState(callId, {
      userId: user.id,
      user: user,
      lastActivity: Date.now()
    });

    console.log(`✅ [CallContextManager] User context updated: ${user.first_name} (${callId})`);
  }

  async setQuoteData(callId: string, quoteData: BookingCalculationResult): Promise<void> {
    await this.callStateManager.setQuoteData(callId, quoteData);

    // Add system message about quote generation
    await this.addSystemMessage(callId, `Quote generated: AUD ${quoteData.total_estimate_amount}`);

    // Emit quote generated event
    await this.voiceEventBus.publish({
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

  }

  async updateAvailableTools(callId: string, tools: string[]): Promise<void> {
    await this.updateCallState(callId, { toolsAvailable: tools });
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
    // Store chat session ID in call state and update activity
    const callState = await this.callStateManager.getCallState(callId);
    if (callState) {
      callState.chatSessionId = chatSessionId;
      await this.updateCallState(callId, { lastActivity: Date.now() });
    }

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
      await this.voiceEventBus.publish({
        type: 'voice:call:ended',
        callId,
        timestamp: Date.now(),
        data: { reason }
      });

    } catch (error) {
      console.error(`❌ [CallContext] Failed to end call ${callId}:`, error);
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private setupEventListeners(): void {
    // Enterprise pattern: One subscription per service with internal event filtering
    this.voiceEventBus.subscribe('voice:events', this.handleAllEvents.bind(this), `CallContextManager-${this.instanceId}`);
  }

  private async handleAllEvents(event: VoiceEvent): Promise<void> {
    // Internal event routing (enterprise pattern)
    switch (event.type) {
      case 'voice:websocket:connected':
        await this.handleWebSocketConnected(event);
        break;

      case 'voice:websocket:disconnected':
        await this.handleWebSocketDisconnected(event);
        break;

      case 'voice:call:ended':
        await this.handleCallEndedEvent(event);
        break;

      case 'voice:message:user':
        await this.handleUserMessageEvent(event);
        break;

      case 'voice:message:assistant':
        await this.handleAssistantMessageEvent(event);
        break;

      case 'voice:message:system':
        await this.handleSystemMessageEvent(event);
        break;


      default:
        // Ignore irrelevant events
        break;
    }
  }

  private async handleWebSocketConnected(event: VoiceEvent): Promise<void> {
    await this.updateCallState(event.callId, {
      webSocketStatus: 'connected',
      lastActivity: Date.now()
    });
  }

  private async handleWebSocketDisconnected(event: VoiceEvent): Promise<void> {
    // End the call since WebSocket disconnection means call is over
    const disconnectData = event.data as { code?: number; reason?: string };
    const reason = `websocket_close: ${disconnectData.code || 'unknown'}`;
    await this.endCall(event.callId, reason);
  }

  private async handleCallEndedEvent(event: VoiceEvent): Promise<void> {
    // Update call state to ended (this replaces the direct endCall method)
    await this.updateCallState(event.callId, {
      status: 'ended',
      lastActivity: Date.now()
    });

    // Set TTL for cleanup (1 hour)
    await simpleTTL.setEndedCallTTL(event.callId);
  }

  private async handleUserMessageEvent(event: VoiceEvent): Promise<void> {
    const { content, openai_item_id } = event.data as { content: string; openai_item_id?: string };
    await this.addUserMessage(event.callId, content, openai_item_id);
  }

  private async handleAssistantMessageEvent(event: VoiceEvent): Promise<void> {
    const { content, openai_item_id } = event.data as { content: string; openai_item_id?: string };
    await this.addAssistantMessage(event.callId, content, openai_item_id);
  }

  private async handleSystemMessageEvent(event: VoiceEvent): Promise<void> {
    const { content } = event.data as { content: string };
    await this.addSystemMessage(event.callId, content);
  }


  /**
   * Get current user for a call (event-driven approach)
   */
  async getCurrentUser(callId: string): Promise<User | null> {
    try {
      const callState = await this.callStateManager.getCallState(callId);
      return callState?.user || null;
    } catch (error) {
      console.error(`❌ [${this.instanceId}] Failed to get current user for call ${callId}:`, error);
      return null;
    }
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
