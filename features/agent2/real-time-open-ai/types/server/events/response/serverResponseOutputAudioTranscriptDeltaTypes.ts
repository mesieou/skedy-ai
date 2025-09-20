/**
 * OpenAI Realtime API Server Response Output Audio Transcript Delta Types
 * Based exactly on the response.output_audio_transcript.delta server event documentation
 */

// ============================================================================
// SERVER RESPONSE OUTPUT AUDIO TRANSCRIPT DELTA EVENT
// ============================================================================

export interface ServerResponseOutputAudioTranscriptDeltaEvent {
  content_index: number;
  delta: string;
  event_id: string;
  item_id: string;
  output_index: number;
  response_id: string;
  type: string;
}
