import { BaseEntity } from "./base";

export interface ChatSession extends BaseEntity {
  channel: string;
  user_id: string;
  business_id: string;
  status: string;
  ended_at?: string | null;
  all_messages?: Record<string, unknown> | null;
}

export type CreateChatSessionData = Omit<ChatSession, 'id' | 'created_at' | 'updated_at'>;
export type UpdateChatSessionData = Partial<Omit<ChatSession, 'id' | 'created_at'>>;
