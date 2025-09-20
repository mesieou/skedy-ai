/**
 * OpenAI Realtime API Server Input Audio Transcription Completed Types
 * Based exactly on the conversation.item.input_audio_transcription.completed server event documentation
 */

// ============================================================================
// TRANSCRIPTION LOG PROBABILITIES
// ============================================================================

export interface TranscriptionLogProb {
  bytes: number[];
  logprob: number;
  token: string;
}

// ============================================================================
// USAGE STATISTICS
// ============================================================================

export interface InputTokenDetails {
  audio_tokens: number;
  text_tokens: number;
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  type: string;
  input_token_details: InputTokenDetails;
}

export interface DurationUsage {
  seconds: number;
  type: string;
}

export type TranscriptionUsage = TokenUsage | DurationUsage;

// ============================================================================
// SERVER INPUT AUDIO TRANSCRIPTION COMPLETED EVENT
// ============================================================================

export interface ServerInputAudioTranscriptionCompletedEvent {
  content_index: number;
  event_id: string;
  item_id: string;
  logprobs: TranscriptionLogProb[];
  transcript: string;
  type: string;
  usage: TranscriptionUsage;
}
