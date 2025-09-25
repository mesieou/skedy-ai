/**
 * OpenAI Realtime API Server Response Output Item Added Types
 * Based exactly on the response.output_item.added server event documentation
 */

import { ConversationItem } from '../../../client/events/clientConversationItemCreateTypes';

// ============================================================================
// SERVER RESPONSE OUTPUT ITEM ADDED EVENT
// ============================================================================

export interface ServerResponseOutputItemAddedEvent {
  event_id: string;
  item: ConversationItem;
  output_index: number;
  response_id: string;
  type: string;
}
