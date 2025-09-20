import { CreateSessionData } from "../../types/session";
import { ChatChannel, ChatSessionStatus, TokenSpent } from "../../types/chat-sessions";

export const sessionsData: CreateSessionData[] = [
  {
    channel: ChatChannel.PHONE,
    user_id: "user_john_smith_123",
    business_id: "biz_removalist_sydney",
    status: ChatSessionStatus.ENDED,
    ended_at: "2025-01-15T10:45:00Z",
    token_spent: {
      inputTokens: 1250,
      outputTokens: 890,
      cachedTokens: 200,
      uncachedTokens: 1050,
      audioInputTokens: 500,
      audioOutputTokens: 300,
      totalCost: 0.45,
      lastUpdated: Date.now()
    } as TokenSpent
  },

  {
    channel: ChatChannel.PHONE,
    user_id: null, // Anonymous call
    business_id: "biz_removalist_sydney",
    status: ChatSessionStatus.ENDED,
    ended_at: "2025-01-15T14:25:00Z",
    token_spent: {
      inputTokens: 450,
      outputTokens: 320,
      cachedTokens: 100,
      uncachedTokens: 350,
      audioInputTokens: 200,
      audioOutputTokens: 150,
      totalCost: 0.18,
      lastUpdated: Date.now()
    } as TokenSpent
  },

  {
    channel: ChatChannel.PHONE,
    user_id: "user_jane_doe_456",
    business_id: "biz_removalist_melbourne",
    status: ChatSessionStatus.ACTIVE, // Currently ongoing
    ended_at: null,
    token_spent: null // Will be set when call ends
  }
];
