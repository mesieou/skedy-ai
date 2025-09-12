/**
 * Real-Time Conversation Manager
 *
 * Manages conversation messages in Redis with:
 * - Fast message retrieval for AI conversation context
 * - OpenAI message format compatibility
 * - Full conversation history preservation
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


  // ============================================================================
  // MESSAGE OPERATIONS
  // ============================================================================

  async addMessage(callId: string, message: Omit<ConversationMessage, 'id' | 'timestamp'>): Promise<ConversationMessage> {
    const fullMessage: ConversationMessage = {
      ...message,
      id: this.generateMessageId(callId),
      timestamp: Date.now()
    };

    // FIXED: Use Redis list append instead of rewriting entire conversation
    await this.appendMessageToList(callId, fullMessage);

    return fullMessage;
  }

  async getRecentMessages(callId: string, limit: number = 50): Promise<ConversationMessage[]> {
    return await simpleCircuitBreaker.execute(
      // Redis operation
      async () => {
        const messagesKey = `${this.keyPrefix}:${callId}:messages`;

        // FIXED: Get messages from Redis list (much faster than JSON parsing entire conversation)
        const messageStrings = await voiceRedisClient.lrange(messagesKey, 0, limit - 1);

        const messages: ConversationMessage[] = messageStrings
          .map(msgStr => {
            try {
              return JSON.parse(msgStr) as ConversationMessage;
            } catch {
              return null;
            }
          })
          .filter((msg): msg is ConversationMessage => msg !== null)
          .reverse(); // Reverse because Redis list is newest-first

        console.log(`💬 [RealTimeConversation] Retrieved ${messages.length} recent messages for ${callId} from list`);
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
    const messagesKey = `${this.keyPrefix}:${callId}:messages`;
    try {
      return await voiceRedisClient.llen(messagesKey);
    } catch (error) {
      console.error(`❌ [RealTimeConversation] Failed to get message count for ${callId}:`, error);
      return 0;
    }
  }

  async getLastMessage(callId: string): Promise<ConversationMessage | null> {
    const messagesKey = `${this.keyPrefix}:${callId}:messages`;
    try {
      // Get the most recent message (index 0 in Redis list)
      const messageStrings = await voiceRedisClient.lrange(messagesKey, 0, 0);
      if (messageStrings.length === 0) return null;

      return JSON.parse(messageStrings[0]) as ConversationMessage;
    } catch (error) {
      console.error(`❌ [RealTimeConversation] Failed to get last message for ${callId}:`, error);
      return null;
    }
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
    const messagesKey = `${this.keyPrefix}:${callId}:messages`;
    const metaKey = `${this.keyPrefix}:${callId}:meta`;

    try {
      const messageCount = await voiceRedisClient.llen(messagesKey);
      if (messageCount === 0) {
        return {
          messageCount: 0,
          lastActivity: 0,
          hasUserMessages: false,
          hasAssistantMessages: false,
          duration: 0
        };
      }

      // Get metadata for last activity
      const metaData = await voiceRedisClient.get(metaKey);
      const meta = metaData ? JSON.parse(metaData) : null;

      // Get all messages to analyze roles and duration
      const allMessages = await this.getRecentMessages(callId, messageCount);
      const userMessages = allMessages.filter(m => m.role === 'user');
      const assistantMessages = allMessages.filter(m => m.role === 'assistant');
      const firstMessage = allMessages[0];
      const duration = firstMessage ? Date.now() - firstMessage.timestamp : 0;

      return {
        messageCount,
        lastActivity: meta?.lastMessageAt || 0,
        hasUserMessages: userMessages.length > 0,
        hasAssistantMessages: assistantMessages.length > 0,
        duration
      };
    } catch (error) {
      console.error(`❌ [RealTimeConversation] Failed to get conversation summary for ${callId}:`, error);
      return {
        messageCount: 0,
        lastActivity: 0,
        hasUserMessages: false,
        hasAssistantMessages: false,
        duration: 0
      };
    }
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


  // ============================================================================
  // INTERNAL METHODS
  // ============================================================================

  private async appendMessageToList(callId: string, message: ConversationMessage): Promise<void> {
    await simpleCircuitBreaker.execute(
      async () => {
        const messagesKey = `${this.keyPrefix}:${callId}:messages`;
        const metaKey = `${this.keyPrefix}:${callId}:meta`;

        // FIXED: Append to Redis list (O(1)) instead of rewriting entire conversation (O(n))
        await voiceRedisClient.lpush(messagesKey, JSON.stringify(message));

        // Update metadata with latest info
        const meta = {
          callId,
          lastMessageAt: message.timestamp,
          lastUpdated: Date.now()
        };
        await voiceRedisClient.set(metaKey, JSON.stringify(meta));

        console.log(`💾 [RealTime] Appended message to list for ${callId}`);
      },
      async () => {
        console.log(`💬 [RealTime] Redis fallback: storing message for ${callId} in database`);
        // TODO: Database fallback
      }
    );
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
