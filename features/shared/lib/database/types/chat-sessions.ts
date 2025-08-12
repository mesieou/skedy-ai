import { BaseEntity } from "./base";

// Chat session enums
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

export interface ChatSession extends BaseEntity {
  channel: ChatChannel;
  user_id: string;
  business_id: string;
  status: ChatSessionStatus;
  ended_at?: string | null;
  all_messages?: Record<string, unknown> | null;
}

export type CreateChatSessionData = Omit<ChatSession, 'id' | 'created_at' | 'updated_at'>;
export type UpdateChatSessionData = Partial<Omit<ChatSession, 'id' | 'created_at'>>;
