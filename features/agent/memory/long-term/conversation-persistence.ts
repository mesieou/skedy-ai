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
  }


  private async handleCallEnded(event: VoiceEvent): Promise<void> {
    const callEndedEvent = event as CallEndedEvent;
    const { reason, duration } = callEndedEvent.data;
    const callId = event.callId;


    try {
      const result = await this.flushCompleteConversation(callId, reason, duration);

      if (result.success) {
      } else {
        console.error(`❌ [ConversationPersistence] Failed to persist conversation: ${result.error}`);
      }

    } catch (error) {
      console.error(`❌ [ConversationPersistence] Error handling call end for ${callId}:`, error);
    } finally {
      // Always clean up pending session
      this.pendingVoiceSessions.delete(callId);
    }
  }

  // ============================================================================
  // CONVERSATION FLUSHING (Single Atomic Operation)
  // ============================================================================

  async flushCompleteConversation(callId: string, endReason: string, duration: number): Promise<ConversationFlushResult> {
    const pendingSession = this.pendingVoiceSessions.get(callId);
    if (!pendingSession) {
      return {
        success: false,
        error: `No pending session found for call ${callId}`
      };
    }

    // Allow anonymous chat sessions (userId can be null)

    try {
      // 1. Get complete conversation from Redis
      const conversationManager = new RealTimeConversationManager();
      const conversationHistory = await conversationManager.getConversationHistory(callId);

      if (!conversationHistory || conversationHistory.messages.length === 0) {
        return { success: true, messageCount: 0 };
      }

      // 2. Create chat session first (empty messages) - userId can be null for anonymous calls
      const chatSession = await this.chatSessionRepository.create({
        channel: ChatChannel.PHONE,
        user_id: pendingSession.userId || null, // Allow null for anonymous calls
        business_id: pendingSession.businessId,
        status: ChatSessionStatus.ENDED, // Already ended
        ended_at: DateUtils.nowUTC(),
        all_messages: [] // Start empty
      });

      // 3. Add all messages to the session (batch operation)
      for (const message of conversationHistory.messages) {
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


      // 4. Emit persistence complete event
        await this.voiceEventBus.publish({
        type: 'voice:conversation:persisted',
        callId,
        timestamp: Date.now(),
        data: {
          chatSessionId: chatSession.id,
          messageCount: conversationHistory.messages.length,
          duration,
          endReason
        }
      });

      return {
        success: true,
        chatSessionId: chatSession.id,
        messageCount: conversationHistory.messages.length
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
