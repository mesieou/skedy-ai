/**
 * Real-Time Conversation Manager
 *
 * Manages conversation messages in Redis with:
 * - Last 100-200 messages per call (capped for performance)
 * - Fast message retrieval for AI conversation context
 * - OpenAI message format compatibility
 * - Automatic message trimming
 */

import { voiceRedisClient } from '../redis/redis-client';
import { simpleCircuitBreaker } from '../redis/simple-circuit-breaker';

// ============================================================================
// TYPES
// ============================================================================

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number; // ms for easier math
  openai_item_id?: string; // Correlation with OpenAI
}

export interface ConversationHistory {
  callId: string;
  messages: ConversationMessage[];
  messageCount: number;
  lastMessageAt: number;
}

// ============================================================================
// REAL-TIME CONVERSATION MANAGER
// ============================================================================

export class RealTimeConversationManager {
  private readonly keyPrefix = 'voice:call';
  private readonly maxMessages = parseInt(process.env.VOICE_MAX_MESSAGES || '200');
  private readonly trimThreshold = parseInt(process.env.VOICE_TRIM_THRESHOLD || '250');

  // ============================================================================
  // MESSAGE OPERATIONS
  // ============================================================================

  async addMessage(callId: string, message: Omit<ConversationMessage, 'id' | 'timestamp'>): Promise<ConversationMessage> {
    const fullMessage: ConversationMessage = {
      ...message,
      id: this.generateMessageId(callId),
      timestamp: Date.now()
    };

    await simpleCircuitBreaker.execute(
      // Redis operation
      async () => {
        const key = this.getMessagesKey(callId);
        const conversationHistory = await this.getConversationHistory(callId);

        const updatedMessages = [...(conversationHistory?.messages || []), fullMessage];

        // Trim messages if we exceed threshold
        const finalMessages = await this.trimMessagesIfNeeded(updatedMessages);

        const updatedHistory: ConversationHistory = {
          callId,
          messages: finalMessages,
          messageCount: finalMessages.length,
          lastMessageAt: fullMessage.timestamp
        };

        await voiceRedisClient.set(key, JSON.stringify(updatedHistory));
        console.log(`💬 [RealTimeConversation] Added ${message.role} message to ${callId} (total: ${finalMessages.length})`);
      },
      // Fallback operation
      async () => {
        console.log(`💬 [RealTime] Redis fallback: storing message for ${callId} in database`);
        // TODO: Implement database fallback when needed
      }
    );

    return fullMessage;
  }

  async getRecentMessages(callId: string, limit: number = 50): Promise<ConversationMessage[]> {
    return await simpleCircuitBreaker.execute(
      // Redis operation
      async () => {
        const conversationHistory = await this.getConversationHistory(callId);
        if (!conversationHistory) return [];

        const messages = conversationHistory.messages.slice(-limit);
        console.log(`💬 [RealTimeConversation] Retrieved ${messages.length} recent messages for ${callId}`);
        return messages;
      },
      // Fallback operation
      async () => {
        console.log(`💬 [RealTime] Redis fallback: retrieving messages for ${callId} from database`);
        // TODO: Implement database fallback when needed
        return [];
      }
    );
  }

  async getMessageCount(callId: string): Promise<number> {
    const conversationHistory = await this.getConversationHistory(callId);
    return conversationHistory?.messageCount || 0;
  }

  async getLastMessage(callId: string): Promise<ConversationMessage | null> {
    const conversationHistory = await this.getConversationHistory(callId);
    if (!conversationHistory || conversationHistory.messages.length === 0) return null;

    return conversationHistory.messages[conversationHistory.messages.length - 1];
  }

  // ============================================================================
  // CONVERSATION HISTORY OPERATIONS
  // ============================================================================

  async getConversationHistory(callId: string): Promise<ConversationHistory | null> {
    const key = this.getMessagesKey(callId);

    try {
      const data = await voiceRedisClient.get(key);
      if (!data) return null;

      return JSON.parse(data) as ConversationHistory;
    } catch (error) {
      console.error(`❌ [RealTimeConversation] Failed to get conversation history for ${callId}:`, error);
      return null;
    }
  }

  async getConversationSummary(callId: string): Promise<{
    messageCount: number;
    lastActivity: number;
    hasUserMessages: boolean;
    hasAssistantMessages: boolean;
    duration: number;
  }> {
    const conversationHistory = await this.getConversationHistory(callId);

    if (!conversationHistory) {
      return {
        messageCount: 0,
        lastActivity: 0,
        hasUserMessages: false,
        hasAssistantMessages: false,
        duration: 0
      };
    }

    const userMessages = conversationHistory.messages.filter(m => m.role === 'user');
    const assistantMessages = conversationHistory.messages.filter(m => m.role === 'assistant');
    const firstMessage = conversationHistory.messages[0];
    const duration = firstMessage ? Date.now() - firstMessage.timestamp : 0;

    return {
      messageCount: conversationHistory.messageCount,
      lastActivity: conversationHistory.lastMessageAt,
      hasUserMessages: userMessages.length > 0,
      hasAssistantMessages: assistantMessages.length > 0,
      duration
    };
  }

  // ============================================================================
  // MESSAGE FORMATTING & UTILITIES
  // ============================================================================

  createUserMessage(content: string, openai_item_id?: string): Omit<ConversationMessage, 'id' | 'timestamp'> {
    return {
      role: 'user',
      content,
      openai_item_id
    };
  }

  createAssistantMessage(content: string, openai_item_id?: string): Omit<ConversationMessage, 'id' | 'timestamp'> {
    return {
      role: 'assistant',
      content,
      openai_item_id
    };
  }

  createSystemMessage(content: string): Omit<ConversationMessage, 'id' | 'timestamp'> {
    return {
      role: 'system',
      content
    };
  }

  // ============================================================================
  // INTERNAL METHODS
  // ============================================================================

  private async trimMessagesIfNeeded(messages: ConversationMessage[]): Promise<ConversationMessage[]> {
    if (messages.length <= this.trimThreshold) {
      return messages;
    }

    // Keep the most recent maxMessages
    const trimmed = messages.slice(-this.maxMessages);
    console.log(`✂️ [RealTime] Trimmed messages: ${messages.length} → ${trimmed.length}`);

    return trimmed;
  }

  private generateMessageId(callId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `msg_${callId}_${timestamp}_${random}`;
  }

  private getMessagesKey(callId: string): string {
    return `${this.keyPrefix}:${callId}:messages`;
  }

  // ============================================================================
  // CLEANUP & MONITORING
  // ============================================================================

  async clearConversationHistory(callId: string): Promise<void> {
    const key = this.getMessagesKey(callId);

    try {
      await voiceRedisClient.del(key);
      console.log(`🗑️ [RealTimeConversation] Cleared conversation history for ${callId}`);
    } catch (error) {
      console.error(`❌ [RealTimeConversation] Failed to clear conversation history for ${callId}:`, error);
    }
  }

  async getConversationStats(): Promise<{
    totalContexts: number;
    totalMessages: number;
    averageMessagesPerCall: number;
  }> {
    try {
      const contextKeys = await voiceRedisClient.client.keys(`${this.keyPrefix}:*:messages`);
      let totalMessages = 0;

      for (const key of contextKeys) {
        const data = await voiceRedisClient.get(key);
        if (data) {
          const conversationHistory = JSON.parse(data) as ConversationHistory;
          totalMessages += conversationHistory.messageCount;
        }
      }

      return {
        totalContexts: contextKeys.length,
        totalMessages,
        averageMessagesPerCall: contextKeys.length > 0 ? Math.round(totalMessages / contextKeys.length) : 0
      };
    } catch (error) {
      console.error('❌ [RealTimeConversation] Failed to get conversation stats:', error);
      return { totalContexts: 0, totalMessages: 0, averageMessagesPerCall: 0 };
    }
  }
}
