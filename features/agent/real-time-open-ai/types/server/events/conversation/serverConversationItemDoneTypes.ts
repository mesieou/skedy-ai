/**
 * OpenAI Realtime API Server Conversation Item Done Types
 * Based exactly on the conversation.item.done server event documentation
 */

import { ConversationItem } from '../../../client/events/clientConversationItemCreateTypes';

// ============================================================================
// SERVER CONVERSATION ITEM DONE EVENT
// ============================================================================

export interface ServerConversationItemDoneEvent {
  event_id: string;
  item: ConversationItem;
  previous_item_id?: string;
  type: string;
}
