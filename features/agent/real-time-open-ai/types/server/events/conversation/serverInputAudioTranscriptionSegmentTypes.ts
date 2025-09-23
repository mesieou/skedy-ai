/**
 * OpenAI Realtime API Server Input Audio Transcription Segment Types
 * Based exactly on the conversation.item.input_audio_transcription.segment server event documentation
 */

// ============================================================================
// SERVER INPUT AUDIO TRANSCRIPTION SEGMENT EVENT
// ============================================================================

export interface ServerInputAudioTranscriptionSegmentEvent {
  content_index: number;
  end: number;
  event_id: string;
  id: string;
  item_id: string;
  speaker: string;
  start: number;
  text: string;
  type: string;
}
