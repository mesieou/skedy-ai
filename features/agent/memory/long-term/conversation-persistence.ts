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
import { voiceEventBus, type VoiceEvent, type CallEndedEvent } from '../redis/event-bus';
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
  phoneNumber: string;
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
  private pendingVoiceSessions: Map<string, VoiceChatSession> = new Map(); // callId → session info

  constructor() {
    this.chatSessionRepository = new ChatSessionRepository();
    // Don't setup event listeners in constructor - will be done by service container
  }

  // Initialize event listeners (called once by service container)
  initializeEventListeners(): void {
    this.setupEventListeners();
  }

  // ============================================================================
  // EVENT LISTENERS (Only Call Lifecycle - NOT Individual Messages)
  // ============================================================================

  private setupEventListeners(): void {
    // Listen for call started to prepare session info
    voiceEventBus.subscribe('voice:call:started', this.handleCallStarted.bind(this));

    // Listen for user resolved to update session info
    voiceEventBus.subscribe('voice:user:resolved', this.handleUserResolved.bind(this));

    // Listen for call ended to flush complete conversation
    voiceEventBus.subscribe('voice:call:ended', this.handleCallEnded.bind(this));

    console.log('💾 [ConversationPersistence] Event listeners initialized (end-of-call only)');
  }

  // ============================================================================
  // CALL LIFECYCLE HANDLERS
  // ============================================================================

  private async handleCallStarted(event: VoiceEvent): Promise<void> {
    const { phoneNumber, businessId } = event.data as {
      phoneNumber: string;
      businessId: string;
    };

    // Store session info (don't create DB record yet)
    const voiceSession: VoiceChatSession = {
      chatSessionId: '', // Will be created at call end
      callId: event.callId,
      userId: '', // Will be set when user is resolved, empty until then
      businessId,
      phoneNumber,
      createdAt: DateUtils.nowUTC()
    };

    this.pendingVoiceSessions.set(event.callId, voiceSession);
    console.log(`📋 [ConversationPersistence] Prepared session info for call ${event.callId}`);
  }

  private async handleUserResolved(event: VoiceEvent): Promise<void> {
    const { user } = event.data as { user: Record<string, unknown> | null };
    const voiceSession = this.pendingVoiceSessions.get(event.callId);

    if (!voiceSession) {
      console.warn(`⚠️ [ConversationPersistence] No pending session for user resolution: ${event.callId}`);
      return;
    }


    // Update user ID for final persistence - must be a valid user ID
    const userId = user?.id as string;
    if (!userId) {
      console.error(`❌ [ConversationPersistence] No valid user ID provided for ${event.callId}. User data:`, user);
      return;
    }

    voiceSession.userId = userId;
    this.pendingVoiceSessions.set(event.callId, voiceSession);

    console.log(`👤 [ConversationPersistence] User resolved for ${event.callId}: ${voiceSession.userId}`);
  }

  private async handleCallEnded(event: VoiceEvent): Promise<void> {
    const callEndedEvent = event as CallEndedEvent;
    const { reason, duration } = callEndedEvent.data;
    const callId = event.callId;

    console.log(`🏁 [ConversationPersistence] Call ended ${callId} - flushing complete conversation to Postgres`);

    try {
      const result = await this.flushCompleteConversation(callId, reason, duration);

      if (result.success) {
        console.log(`✅ [ConversationPersistence] Successfully persisted ${result.messageCount} messages for ${callId}`);
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

    if (!pendingSession.userId) {
      return {
        success: false,
        error: `No valid user ID for call ${callId} - cannot create chat session`
      };
    }

    try {
      // 1. Get complete conversation from Redis
      const conversationManager = new RealTimeConversationManager();
      const conversationHistory = await conversationManager.getConversationHistory(callId);

      if (!conversationHistory || conversationHistory.messages.length === 0) {
        console.log(`💾 [ConversationPersistence] No conversation to persist for ${callId}`);
        return { success: true, messageCount: 0 };
      }

      // 2. Create chat session first (empty messages)
      const chatSession = await this.chatSessionRepository.create({
        channel: ChatChannel.PHONE,
        user_id: pendingSession.userId,
        business_id: pendingSession.businessId,
        status: ChatSessionStatus.ENDED, // Already ended
        ended_at: DateUtils.nowUTC(),
        all_messages: [] // Start empty
      });

      // 3. Add all messages to the session (batch operation)
      for (const message of conversationHistory.messages) {
        const chatMessageData: CreateChatMessageData = {
          content: message.content,
          sender_type: this.mapRoleToSenderType(message.role)
        };

        await this.chatSessionRepository.addMessage(chatSession.id, chatMessageData);
      }

      console.log(`💾 [ConversationPersistence] Created chat session ${chatSession.id} with ${conversationHistory.messages.length} messages`);

      // 4. Emit persistence complete event
      await voiceEventBus.publish({
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
    console.log(`🔧 [ConversationPersistence] Manual flush requested for ${callId}`);
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
    console.log(`🧹 [ConversationPersistence] Cleaned up pending session for ${callId}`);
  }
}
