/**
 * OpenAI Realtime API Server Input Audio Transcription Failed Types
 * Based exactly on the conversation.item.input_audio_transcription.failed server event documentation
 */

// ============================================================================
// TRANSCRIPTION ERROR DETAILS
// ============================================================================

export interface TranscriptionError {
  code?: string;
  message: string;
  param?: string;
  type: string;
}

// ============================================================================
// SERVER INPUT AUDIO TRANSCRIPTION FAILED EVENT
// ============================================================================

export interface ServerInputAudioTranscriptionFailedEvent {
  content_index: number;
  error: TranscriptionError;
  event_id: string;
  item_id: string;
  type: string;
}
