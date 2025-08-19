import type { ChatSession } from '../../types/chat-sessions';
import { ChatChannel, ChatSessionStatus } from '../../types/chat-sessions';

// Function to create unique chat session data for tests
export function createUniqueChatSessionData(userId: string, businessId: string): Omit<ChatSession, 'id' | 'created_at' | 'updated_at'> {
  return {
    channel: ChatChannel.PHONE,
    user_id: userId,
    business_id: businessId,
    status: ChatSessionStatus.ACTIVE,
    ended_at: null,
    all_messages: []
  };
}

// Test chat session data for seeding
export const defaultChatSessionData: Omit<ChatSession, 'id' | 'created_at' | 'updated_at'> = {
  channel: ChatChannel.PHONE,
  user_id: "placeholder-user-id", // Will be replaced with actual user_id
  business_id: "placeholder-business-id", // Will be replaced with actual business_id
  status: ChatSessionStatus.ACTIVE,
  ended_at: null,
  all_messages: []
};
