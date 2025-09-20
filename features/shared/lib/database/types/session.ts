import { BaseEntity } from "./base";
import { ChatChannel, ChatSessionStatus, TokenSpent } from "./chat-sessions";

/**
 * Voice Agent Session - Database Entity
 *
 * Maps to chat_sessions table in database
 * Stores voice call session data and final state
 */
export interface Session extends BaseEntity {
  // Core fields from chat_sessions table
  channel: ChatChannel;                    // phone, whatsapp, website
  user_id?: string | null;                 // Customer user ID (nullable for anonymous)
  business_id: string;                     // Business this call belongs to
  status: ChatSessionStatus;               // active, ended, paused, transferred
  ended_at?: string | null;                // ISO timestamp when call ended
  token_spent?: TokenSpent | null;         // Final token usage for the call
}

// Create/Update types for database operations
export type CreateSessionData = Omit<Session, 'id' | 'created_at' | 'updated_at'>;
export type UpdateSessionData = Partial<Omit<Session, 'id' | 'created_at' | 'updated_at'>>;
