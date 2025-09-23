/**
 * OpenAI Realtime API Server Response Output Item Done Types
 * Based exactly on the response.output_item.done server event documentation
 */

import { ConversationItem } from './clientConversationItemCreateTypes';

// ============================================================================
// SERVER RESPONSE OUTPUT ITEM DONE EVENT
// ============================================================================

export interface ServerResponseOutputItemDoneEvent {
  event_id: string;
  item: ConversationItem;
  output_index: number;
  response_id: string;
  type: string;
}
