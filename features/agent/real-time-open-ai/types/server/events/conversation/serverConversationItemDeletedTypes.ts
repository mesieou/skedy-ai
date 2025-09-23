/**
 * OpenAI Realtime API Server Conversation Item Deleted Types
 * Based exactly on the conversation.item.deleted server event documentation
 */

// ============================================================================
// SERVER CONVERSATION ITEM DELETED EVENT
// ============================================================================

export interface ServerConversationItemDeletedEvent {
  event_id: string;
  item_id: string;
  type: string;
}
