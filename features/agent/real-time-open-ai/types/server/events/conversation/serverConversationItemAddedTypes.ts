/**
 * OpenAI Realtime API Server Conversation Item Added Types
 * Based exactly on the conversation.item.added server event documentation
 */

import { ConversationItem } from '../../../client/events/clientConversationItemCreateTypes';

// ============================================================================
// SERVER CONVERSATION ITEM ADDED EVENT
// ============================================================================

export interface ServerConversationItemAddedEvent {
  event_id: string;
  item: ConversationItem;
  previous_item_id?: string;
  type: string;
}
