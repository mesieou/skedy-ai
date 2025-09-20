/**
 * OpenAI Realtime API Server Response Output Audio Delta Types
 * Based exactly on the response.output_audio.delta server event documentation
 */

// ============================================================================
// SERVER RESPONSE OUTPUT AUDIO DELTA EVENT
// ============================================================================

export interface ServerResponseOutputAudioDeltaEvent {
  content_index: number;
  delta: string;
  event_id: string;
  item_id: string;
  output_index: number;
  response_id: string;
  type: string;
}
