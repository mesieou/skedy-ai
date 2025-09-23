/**
 * OpenAI Realtime API Conversation Item Delete Types
 * Based exactly on the conversation.item.delete event documentation
 */

// ============================================================================
// CONVERSATION ITEM DELETE EVENT
// ============================================================================

export interface ConversationItemDeleteEvent {
  event_id?: string;
  item_id: string;
  type: string;
}
