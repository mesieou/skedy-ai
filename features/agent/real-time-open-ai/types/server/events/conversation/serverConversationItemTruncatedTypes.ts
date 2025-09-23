/**
 * OpenAI Realtime API Server Conversation Item Truncated Types
 * Based exactly on the conversation.item.truncated server event documentation
 */

// ============================================================================
// SERVER CONVERSATION ITEM TRUNCATED EVENT
// ============================================================================

export interface ServerConversationItemTruncatedEvent {
  audio_end_ms: number;
  content_index: number;
  event_id: string;
  item_id: string;
  type: string;
}
