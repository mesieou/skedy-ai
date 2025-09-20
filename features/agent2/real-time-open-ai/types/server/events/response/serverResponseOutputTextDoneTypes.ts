/**
 * OpenAI Realtime API Server Response Output Text Done Types
 * Based exactly on the response.output_text.done server event documentation
 */

// ============================================================================
// SERVER RESPONSE OUTPUT TEXT DONE EVENT
// ============================================================================

export interface ServerResponseOutputTextDoneEvent {
  content_index: number;
  event_id: string;
  item_id: string;
  output_index: number;
  response_id: string;
  text: string;
  type: string;
}
