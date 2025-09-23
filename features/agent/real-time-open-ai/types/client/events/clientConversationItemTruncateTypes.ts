/**
 * OpenAI Realtime API Conversation Item Truncate Types
 * Based exactly on the conversation.item.truncate event documentation
 */

// ============================================================================
// CONVERSATION ITEM TRUNCATE EVENT
// ============================================================================

export interface ConversationItemTruncateEvent {
  audio_end_ms: number;
  content_index: number;
  event_id?: string;
  item_id: string;
  type: string;
}
