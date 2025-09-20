/**
 * OpenAI Realtime API Server Response Content Part Done Types
 * Based exactly on the response.content_part.done server event documentation
 */

import { ContentPart } from './serverResponseContentPartAddedTypes';

// ============================================================================
// SERVER RESPONSE CONTENT PART DONE EVENT
// ============================================================================

export interface ServerResponseContentPartDoneEvent {
  content_index: number;
  event_id: string;
  item_id: string;
  output_index: number;
  part: ContentPart;
  response_id: string;
  type: string;
}
