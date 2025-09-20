/**
 * OpenAI Realtime API Server Response Output Audio Transcript Done Types
 * Based exactly on the response.output_audio_transcript.done server event documentation
 */

// ============================================================================
// SERVER RESPONSE OUTPUT AUDIO TRANSCRIPT DONE EVENT
// ============================================================================

export interface ServerResponseOutputAudioTranscriptDoneEvent {
  content_index: number;
  event_id: string;
  item_id: string;
  output_index: number;
  response_id: string;
  transcript: string;
  type: string;
}
