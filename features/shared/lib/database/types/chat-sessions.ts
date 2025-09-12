import { BaseEntity } from "./base";

// Chat enums
export enum ChatChannel {
  WHATSAPP = 'whatsapp',
  FACEBOOK = 'facebook',
  WEBSITE = 'website',
  EMAIL = 'email',
  PHONE = 'phone'
}

export enum ChatSessionStatus {
  ACTIVE = 'active',
  ENDED = 'ended',
  PAUSED = 'paused',
  TRANSFERRED = 'transferred'
}

export enum MessageSenderType {
  USER = 'user',
  AGENT = 'agent',
  SYSTEM = 'system'
}

// Chat message interface
export interface ChatMessage extends BaseEntity {
  session_id: string;
  content: string;
  sender_type: MessageSenderType;
  phone_number: string; // Phone number - always required (voice calls, SMS, WhatsApp)
}

// Token usage tracking
export interface TokenSpent {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  uncachedTokens: number;
  audioInputTokens: number;
  audioOutputTokens: number;
  totalCost: number;
  lastUpdated: number;
}

// Chat session interface
export interface ChatSession extends BaseEntity {
  channel: ChatChannel;
  user_id: string | null; // Nullable for anonymous voice calls
  business_id: string;
  status: ChatSessionStatus;
  ended_at?: string | null;
  all_messages?: ChatMessage[]; // JSON column in database
  token_spent?: TokenSpent | null; // Token usage for this call/session
}

// Create/Update types
export type CreateChatMessageData = Omit<ChatMessage, 'id' | 'created_at' | 'session_id'>;
