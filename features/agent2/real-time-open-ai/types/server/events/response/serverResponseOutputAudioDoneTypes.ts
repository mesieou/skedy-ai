/**
 * OpenAI Realtime API Server Response Output Audio Done Types
 * Based exactly on the response.output_audio.done server event documentation
 */

// ============================================================================
// SERVER RESPONSE OUTPUT AUDIO DONE EVENT
// ============================================================================

export interface ServerResponseOutputAudioDoneEvent {
  content_index: number;
  event_id: string;
  item_id: string;
  output_index: number;
  response_id: string;
  type: string;
}
