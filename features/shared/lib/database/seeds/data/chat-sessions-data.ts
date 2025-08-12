import type { CreateChatSessionData } from '../../types/chat-sessions';
import { ChatChannel, ChatSessionStatus } from '../../types/chat-sessions';

// Test chat session data for seeding
export const defaultChatSessionData: CreateChatSessionData = {
  channel: ChatChannel.PHONE,
  user_id: "placeholder-user-id", // Will be replaced with actual user_id
  business_id: "placeholder-business-id", // Will be replaced with actual business_id
  status: ChatSessionStatus.ACTIVE,
  ended_at: null,
  all_messages: {
    "messages": [
      {
        "id": "msg_001",
        "sender": "customer",
        "text": "Hi, I need help with a removal quote",
        "timestamp": "2024-01-15T10:00:00Z"
      },
      {
        "id": "msg_002", 
        "sender": "ai",
        "text": "Hello! I'd be happy to help you with a removal quote. Could you please tell me where you're moving from and to?",
        "timestamp": "2024-01-15T10:00:30Z"
      }
    ],
    "metadata": {
      "customer_phone": "+61412345678",
      "session_started": "2024-01-15T10:00:00Z"
    }
  }
};
