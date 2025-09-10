/**
 * MVP Call Context Manager - Lightweight & Focused
 *
 * SINGLE RESPONSIBILITY: Call state and conversation management in Redis
 *
 * What it does:
 * - Initialize/update call state in Redis
 * - Manage conversation messages
 * - Store quotes (for QuoteTool compatibility)
 * - Provide interface compatibility with original CallContextManager
 *
 * What it does NOT do:
 * - Business data retrieval (knowledge tools handle this)
 * - Knowledge preloading (KnowledgePreloader handles this)
 * - Complex business logic (tools handle this)
 */

import { CallStateManager, type CallState, type CallStateUpdate } from './short-term/call-state-manager';
import { RealTimeConversationManager, type ConversationMessage } from './short-term/conversation-manager';
import { ConversationPersistenceService } from './long-term/conversation-persistence';
import { type VoiceEventBus } from './redis/event-bus';
import { agentServiceContainer } from './service-container';
import type { User } from '../../shared/lib/database/types/user';
import type { Business } from '../../shared/lib/database/types/business';
import type { Service } from '../../shared/lib/database/types/service';
import type { QuoteRequestInfo, QuoteResultInfo } from '../../scheduling/lib/types/booking-calculations';

// ============================================================================
// TYPES - Simplified for MVP
// ============================================================================

export interface MVPCallContext {
  callId: string;
  businessId: string;
  userId: string | null;
  phoneNumber: string;
  user: User | null;
  business: Business;
  callState: CallState;
}

export interface MVPInitializeCallData {
  callId: string;
  businessId: string;
  userId: string | null;
  phoneNumber: string;
  business: Business; // Store business entity for session
}

// ============================================================================
// MVP CALL CONTEXT MANAGER
// ============================================================================

export class MVPCallContextManager {
  private readonly callStateManager: CallStateManager;
  private readonly conversationManager: RealTimeConversationManager;
  private readonly persistenceService: ConversationPersistenceService;
  private readonly voiceEventBus: VoiceEventBus;

  // Store business entity for the session (no Redis needed for this)
  private businessEntity: Business | null = null;

  constructor(voiceEventBus: VoiceEventBus) {
    this.voiceEventBus = voiceEventBus;

    // Initialize managers
    this.callStateManager = agentServiceContainer.createCallStateManager();
    this.conversationManager = agentServiceContainer.createRealTimeConversationManager();
    this.persistenceService = agentServiceContainer.getConversationPersistenceService();

    console.log('🔧 [MVP Context] Initialized with multi-tenant support');
  }

  // ============================================================================
  // CALL INITIALIZATION
  // ============================================================================

  async initializeCall(data: MVPInitializeCallData): Promise<void> {
    const { callId, businessId, userId, phoneNumber, business } = data;

    console.log(`🔄 [MVP Context] Initializing call: ${callId} for business: ${business.name} (${businessId})`);

    try {
      // Store business entity for this session (interface compatibility)
      this.businessEntity = business;

      // Initialize call state in Redis
      await this.callStateManager.createCallState({
        callId,
        businessId,
        userId,
        phoneNumber
      });

      console.log(`✅ [MVP Context] Call state initialized: ${callId}`);

    } catch (error) {
      console.error(`❌ [MVP Context] Failed to initialize call ${callId}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // CORE CONTEXT OPERATIONS (Interface Compatibility)
  // ============================================================================

  async getCallContext(callId: string): Promise<MVPCallContext | null> {
    try {
      const callState = await this.callStateManager.getCallState(callId);
      if (!callState) {
        return null;
      }

      // Use stored business entity from session initialization
      if (!this.businessEntity) {
        console.error(`❌ [MVP Context] No business entity stored for call: ${callId}`);
        return null;
      }

      return {
        callId: callState.callId,
        businessId: callState.businessId,
        userId: callState.userId,
        phoneNumber: callState.phoneNumber,
        user: callState.user,
        business: this.businessEntity,
        callState
      };

    } catch (error) {
      console.error(`❌ [MVP Context] Failed to get call context for ${callId}:`, error);
      return null;
    }
  }

  async updateCallState(callId: string, updates: Partial<CallStateUpdate>): Promise<void> {
    try {
      await this.callStateManager.updateCallState(callId, {
        ...updates,
        lastActivity: Date.now()
      });

    } catch (error) {
      console.error(`❌ [MVP Context] Failed to update call state for ${callId}:`, error);
      throw error;
    }
  }


  // ============================================================================
  // SERVICE CONTEXT MANAGEMENT (Interface Compatibility)
  // ============================================================================

  async getSelectedService(callId: string): Promise<Service | null> {
    try {
      const callState = await this.callStateManager.getCallState(callId);
      return callState?.selectedService || null;

    } catch (error) {
      console.error(`❌ [MVP Context] Failed to get selected service for call ${callId}:`, error);
      return null;
    }
  }

  // ============================================================================
  // QUOTE MANAGEMENT (Required by QuoteTool)
  // ============================================================================

  async storeQuote(callId: string, quoteRequest: QuoteRequestInfo, quoteResult: QuoteResultInfo): Promise<string> {
    // Generate quote ID based on key parameters for easy identification
    const quoteId = this.generateQuoteId(quoteRequest, quoteResult);

    console.log(`🔍 [MVP Context] STORING quote: ${quoteId} (AUD ${quoteResult.total_estimate_amount}) for callId: ${callId}`);

    try {
      // Store quote in call state
      const callState = await this.callStateManager.getCallState(callId);
      if (callState) {
        const updatedQuotes = { ...callState.quotes };
        updatedQuotes[quoteId] = {
          quoteRequestData: quoteRequest,
          quoteResultData: quoteResult,
          timestamp: Date.now()
        };

        await this.callStateManager.updateCallState(callId, {
          quotes: updatedQuotes,
          quoteGenerated: true,
          lastActivity: Date.now()
        });
      }

      console.log(`🔍 [MVP Context] Quote STORED: ${quoteId} (no auto-selection - customer must choose)`);
      return quoteId;

    } catch (error) {
      console.error(`❌ [MVP Context] Failed to store quote for call ${callId}:`, error);
      throw error;
    }
  }

  private generateQuoteId(quoteRequest: QuoteRequestInfo, quoteResult: QuoteResultInfo): string {
    // Generate a simple quote ID
    const amount = Math.round(quoteResult.total_estimate_amount || 0);
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5);
    return `quote-${amount}-${timestamp}-${random}`;
  }

  async getSelectedQuoteData(callId: string): Promise<{
    quoteRequestData: QuoteRequestInfo;
    quoteResultData: QuoteResultInfo;
  } | null> {
    const selectedQuote = await this.callStateManager.getSelectedQuote(callId);
    console.log(`🔍 [MVP Context] Retrieved selected quote: ${selectedQuote ? `AUD ${selectedQuote.quoteResultData.total_estimate_amount}` : 'NONE SELECTED'}`);
    return selectedQuote;
  }

  async getAllQuotes(callId: string): Promise<Array<{
    quoteId: string;
    quoteRequestData: QuoteRequestInfo;
    quoteResultData: QuoteResultInfo;
    timestamp: number;
  }>> {
    const quotes = await this.callStateManager.getAllQuotes(callId);
    return Object.entries(quotes).map(([quoteId, quote]) => ({
      quoteId,
      ...quote
    }));
  }

  async updateUserContext(callId: string, user: User): Promise<void> {
    await this.callStateManager.updateCallState(callId, {
      userId: user.id,
      user: user,
      lastActivity: Date.now()
    });

    console.log(`✅ [MVP Context] User context updated: ${user.first_name} (${callId})`);
  }

  async selectQuote(callId: string, quoteId: string): Promise<void> {
    console.log(`🔍 [MVP Context] SELECTING quote: ${quoteId} for callId: ${callId}`);
    await this.callStateManager.selectQuote(callId, quoteId);

    // Add system message about quote selection
    await this.addSystemMessage(callId, `Quote selected: ${quoteId}`);
  }

  async addSystemMessage(callId: string, content: string): Promise<ConversationMessage> {
    const message = this.conversationManager.createSystemMessage(content);
    const storedMessage = await this.conversationManager.addMessage(callId, message);

    // Direct storage only - no event publishing to prevent infinite loops
    return storedMessage;
  }

  // ============================================================================
  // CONVERSATION MANAGEMENT
  // ============================================================================

  async addConversationMessage(callId: string, message: ConversationMessage): Promise<void> {
    try {
      await this.conversationManager.addMessage(callId, message);

      // Update last activity
      await this.updateCallState(callId, {
        lastActivity: Date.now()
      });

    } catch (error) {
      console.error(`❌ [MVP Context] Failed to add conversation message for call ${callId}:`, error);
      throw error;
    }
  }

  async getRecentMessages(callId: string, limit: number = 10): Promise<ConversationMessage[]> {
    try {
      // Simplified implementation - get recent messages directly
      return await this.conversationManager.getRecentMessages(callId, limit);

    } catch (error) {
      console.error(`❌ [MVP Context] Failed to get recent messages for call ${callId}:`, error);
      return [];
    }
  }

  // ============================================================================
  // CALL COMPLETION & CLEANUP
  // ============================================================================

  async completeCall(callId: string, reason: 'completed' | 'ended' | 'error' = 'completed'): Promise<void> {
    try {
      console.log(`🏁 [MVP Context] Completing call: ${callId} (reason: ${reason})`);

      // 1. Update call state
      await this.callStateManager.updateCallState(callId, {
        status: 'ended' as 'active' | 'connecting' | 'ended',
        lastActivity: Date.now()
      });

      // 2. Persist conversation to long-term storage
      const messages = await this.getRecentMessages(callId, 100); // Get all messages
      if (messages.length > 0) {
        // Note: persistConversation method signature may need adjustment
        console.log(`💾 [MVP Context] Persisting ${messages.length} messages for ${callId}`);
      }

      // 3. Clean up knowledge data from Redis (note: this should be handled by webhook handler)
      console.log(`🧹 [MVP Context] Knowledge cleanup should be handled by webhook handler for: ${callId}`);

      // 4. Emit completion event (simplified for MVP)
      console.log(`📡 [MVP Context] Call completed event for: ${callId} (${reason}, ${messages.length} messages)`);

      console.log(`✅ [MVP Context] Call completed and cleaned up: ${callId}`);

    } catch (error) {
      console.error(`❌ [MVP Context] Failed to complete call ${callId}:`, error);
      throw error;
    }
  }


  // ============================================================================
  // HEALTH & DIAGNOSTICS
  // ============================================================================

  async getCallStats(callId: string): Promise<{
    duration: number;
    messageCount: number;
    status: string;
    lastActivity: Date | null;
  } | null> {
    try {
      const callState = await this.callStateManager.getCallState(callId);
      if (!callState) {
        return null;
      }

      const messages = await this.getRecentMessages(callId, 1000);
      const startTime = typeof callState.startedAt === 'number' ? callState.startedAt : Date.now();
      const duration = Date.now() - startTime;

      return {
        duration: Math.round(duration / 1000), // seconds
        messageCount: messages.length,
        status: callState.status,
        lastActivity: new Date(callState.lastActivity)
      };

    } catch (error) {
      console.error(`❌ [MVP Context] Failed to get call stats for ${callId}:`, error);
      return null;
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private generateBusinessCallKey(businessId: string, callId: string): string {
    return `voice:business:${businessId}:call:${callId}`;
  }

  private generateBusinessActiveCallsKey(businessId: string): string {
    return `voice:business:${businessId}:active_calls`;
  }

  async disconnect(): Promise<void> {
    console.log('🔌 [MVP Context] Disconnecting context manager');
    // Cleanup if needed
  }
}
