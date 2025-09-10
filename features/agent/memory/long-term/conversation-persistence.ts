/**
 * Conversation Persistence Service
 *
 * Manages long-term conversation storage with chat_sessions integration:
 * - Creates chat session for each voice call
 * - Flushes COMPLETE Redis conversation to Postgres at call END only
 * - Single atomic write per call (not real-time)
 * - Event-driven coordination for call lifecycle
 */

import { ChatSessionRepository } from '../../../shared/lib/database/repositories/chat-session-repository';
import { type VoiceEvent, type CallEndedEvent, type VoiceEventBus } from '../redis/event-bus';
import { ChatChannel, ChatSessionStatus, MessageSenderType } from '../../../shared/lib/database/types/chat-sessions';
import type { CreateChatMessageData } from '../../../shared/lib/database/types/chat-sessions';
import { DateUtils } from '../../../shared/utils/date-utils';
import { RealTimeConversationManager } from '../short-term/conversation-manager';

// ============================================================================
// TYPES
// ============================================================================

export interface VoiceChatSession {
  chatSessionId: string;
  callId: string;
  userId: string;
  businessId: string;
  phoneNumber: string; // Caller's phone
  businessPhoneNumber: string; // Business phone for agent messages
  createdAt: string;
}

export interface ConversationFlushResult {
  success: boolean;
  chatSessionId?: string;
  messageCount?: number;
  error?: string;
}

// ============================================================================
// CONVERSATION PERSISTENCE SERVICE
// ============================================================================

export class ConversationPersistenceService {
  private chatSessionRepository: ChatSessionRepository;
  private voiceEventBus: VoiceEventBus;
  private pendingVoiceSessions: Map<string, VoiceChatSession> = new Map(); // callId → session info
  private eventListenersInitialized = false;

  constructor(voiceEventBus: VoiceEventBus) {
    this.voiceEventBus = voiceEventBus;
    this.chatSessionRepository = new ChatSessionRepository();
    // Don't setup event listeners in constructor - will be done by service container
  }

  // Initialize event listeners (called once by service container)
  initializeEventListeners(): void {
    if (this.eventListenersInitialized) {
      return;
    }

    this.setupEventListeners();
    this.eventListenersInitialized = true;
  }

  // ============================================================================
  // EVENT LISTENERS (Only Call Lifecycle - NOT Individual Messages)
  // ============================================================================

  private setupEventListeners(): void {
    // Enterprise pattern: One subscription per service with internal event filtering

    this.voiceEventBus.subscribe('voice:events', this.handleAllEvents.bind(this), 'ConversationPersistenceService');

  }

  private async handleAllEvents(event: VoiceEvent): Promise<void> {
    // Internal event routing (enterprise pattern)
    switch (event.type) {
      case 'voice:call:started':
        await this.handleCallStarted(event);
        break;
      case 'voice:call:ended':
        await this.handleCallEnded(event);
        break;

      default:
        // Ignore irrelevant events
        break;
    }
  }

  // ============================================================================
  // CALL LIFECYCLE HANDLERS
  // ============================================================================

  private async handleCallStarted(event: VoiceEvent): Promise<void> {
    const { phoneNumber, businessId, businessPhoneNumber } = event.data as {
      phoneNumber: string;
      businessId: string;
      businessPhoneNumber: string;
    };

    console.log(`🎬 [ConversationPersistence] Call started: ${event.callId} from ${phoneNumber} for business ${businessId}`);

    // Store session info (don't create DB record yet)
    const voiceSession: VoiceChatSession = {
      chatSessionId: '', // Will be created at call end
      callId: event.callId,
      userId: '', // Will be set when user is resolved, empty until then
      businessId,
      phoneNumber,
      businessPhoneNumber,
      createdAt: DateUtils.nowUTC()
    };

    this.pendingVoiceSessions.set(event.callId, voiceSession);
    console.log(`📋 [ConversationPersistence] Pending session created for: ${event.callId} (${this.pendingVoiceSessions.size} total pending)`);
  }


  private async handleCallEnded(event: VoiceEvent): Promise<void> {
    const callEndedEvent = event as CallEndedEvent;
    const { reason, duration } = callEndedEvent.data;
    const callId = event.callId;

    console.log(`🏁 [ConversationPersistence] Call ended: ${callId} (reason: ${reason}, duration: ${duration}s)`);

    try {
      const result = await this.flushCompleteConversation(callId, reason, duration);

      if (result.success) {
        console.log(`✅ [ConversationPersistence] Successfully persisted conversation: ${callId} (${result.messageCount} messages, session: ${result.chatSessionId})`);
      } else {
        console.error(`❌ [ConversationPersistence] Failed to persist conversation: ${result.error}`);
      }

    } catch (error) {
      console.error(`❌ [ConversationPersistence] Error handling call end for ${callId}:`, error);
    } finally {
      // Always clean up pending session
      this.pendingVoiceSessions.delete(callId);
      console.log(`🧹 [ConversationPersistence] Cleaned up pending session for: ${callId} (${this.pendingVoiceSessions.size} remaining)`);
    }
  }

  // ============================================================================
  // CONVERSATION FLUSHING (Single Atomic Operation)
  // ============================================================================

  async flushCompleteConversation(callId: string, endReason: string, duration: number): Promise<ConversationFlushResult> {
    console.log(`💾 [ConversationPersistence] Starting conversation flush for: ${callId} (reason: ${endReason}, duration: ${duration}s)`);

    const pendingSession = this.pendingVoiceSessions.get(callId);
    if (!pendingSession) {
      console.error(`❌ [ConversationPersistence] No pending session found for call ${callId}`);
      return {
        success: false,
        error: `No pending session found for call ${callId}`
      };
    }

    console.log(`📋 [ConversationPersistence] Found pending session: ${callId} (business: ${pendingSession.businessId}, phone: ${pendingSession.phoneNumber})`);

    try {
      // 1. Get complete conversation from Redis (using new list-based approach)
      const conversationManager = new RealTimeConversationManager();
      const messageCount = await conversationManager.getMessageCount(callId);

      console.log(`📊 [ConversationPersistence] Message count from Redis: ${messageCount} for ${callId}`);

      if (messageCount === 0) {
        console.log(`📭 [ConversationPersistence] No messages to persist for ${callId}`);
        return { success: true, messageCount: 0 };
      }

      // Get all messages from the Redis list
      const messages = await conversationManager.getRecentMessages(callId, messageCount);
      console.log(`📥 [ConversationPersistence] Retrieved ${messages.length} messages from Redis for ${callId}`);

      // 2. Create chat session first (empty messages) - userId can be null for anonymous calls
      console.log(`🗃️ [ConversationPersistence] Creating chat session for ${callId} (business: ${pendingSession.businessId}, user: ${pendingSession.userId || 'anonymous'})`);

      const chatSession = await this.chatSessionRepository.create({
        channel: ChatChannel.PHONE,
        user_id: pendingSession.userId || null, // Allow null for anonymous calls
        business_id: pendingSession.businessId,
        status: ChatSessionStatus.ENDED, // Already ended
        ended_at: DateUtils.nowUTC(),
        all_messages: [] // Start empty
      });

      console.log(`✅ [ConversationPersistence] Created chat session: ${chatSession.id} for ${callId}`);

      // 3. Add all messages to the session (batch operation)
      console.log(`📝 [ConversationPersistence] Adding ${messages.length} messages to chat session ${chatSession.id}`);

      for (const message of messages) {
        const senderType = this.mapRoleToSenderType(message.role);
        const phoneNumber = senderType === MessageSenderType.USER
          ? pendingSession.phoneNumber  // User messages from caller's phone
          : pendingSession.businessPhoneNumber; // Agent/system messages from business phone

        const chatMessageData: CreateChatMessageData = {
          content: message.content,
          sender_type: senderType,
          phone_number: phoneNumber
        };

        await this.chatSessionRepository.addMessage(chatSession.id, chatMessageData);
      }

      console.log(`✅ [ConversationPersistence] Added all ${messages.length} messages to chat session ${chatSession.id}`);

      // Note: voice:conversation:persisted event removed - no current subscribers
      return {
        success: true,
        chatSessionId: chatSession.id,
        messageCount: messages.length
      };

    } catch (error) {
      console.error(`❌ [ConversationPersistence] Failed to flush conversation for ${callId}:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private mapRoleToSenderType(role: 'user' | 'assistant' | 'system'): MessageSenderType {
    switch (role) {
      case 'user':
        return MessageSenderType.USER;
      case 'assistant':
        return MessageSenderType.AGENT;
      case 'system':
        return MessageSenderType.SYSTEM;
      default:
        return MessageSenderType.SYSTEM;
    }
  }

  // ============================================================================
  // MONITORING & MANUAL OPERATIONS
  // ============================================================================

  async getPendingSessionsCount(): Promise<number> {
    return this.pendingVoiceSessions.size;
  }

  async getAllPendingSessions(): Promise<VoiceChatSession[]> {
    return Array.from(this.pendingVoiceSessions.values());
  }

  async manualFlushCall(callId: string, reason: string = 'manual_flush'): Promise<ConversationFlushResult> {
    return await this.flushCompleteConversation(callId, reason, 0);
  }

  async getPendingSessionInfo(callId: string): Promise<VoiceChatSession | null> {
    return this.pendingVoiceSessions.get(callId) || null;
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  async cleanupPendingSession(callId: string): Promise<void> {
    this.pendingVoiceSessions.delete(callId);
  }
}
