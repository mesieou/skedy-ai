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
}

// Chat session interface
export interface ChatSession extends BaseEntity {
  channel: ChatChannel;
  user_id: string;
  business_id: string;
  status: ChatSessionStatus;
  ended_at?: string | null;
  all_messages?: ChatMessage[]; // JSON column in database
}

// Create/Update types
export type CreateChatMessageData = Omit<ChatMessage, 'id' | 'created_at' | 'updated_at' | 'session_id'>;




