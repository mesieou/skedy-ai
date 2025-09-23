/**
 * OpenAI Realtime API Server Response Output Text Delta Types
 * Based exactly on the response.output_text.delta server event documentation
 */

// ============================================================================
// SERVER RESPONSE OUTPUT TEXT DELTA EVENT
// ============================================================================

export interface ServerResponseOutputTextDeltaEvent {
  content_index: number;
  delta: string;
  event_id: string;
  item_id: string;
  output_index: number;
  response_id: string;
  type: string;
}
