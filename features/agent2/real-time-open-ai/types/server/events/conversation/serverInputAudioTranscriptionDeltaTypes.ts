/**
 * OpenAI Realtime API Server Input Audio Transcription Delta Types
 * Based exactly on the conversation.item.input_audio_transcription.delta server event documentation
 */

import { TranscriptionLogProb } from './serverInputAudioTranscriptionCompletedTypes';

// ============================================================================
// SERVER INPUT AUDIO TRANSCRIPTION DELTA EVENT
// ============================================================================

export interface ServerInputAudioTranscriptionDeltaEvent {
  content_index: number;
  delta: string;
  event_id: string;
  item_id: string;
  logprobs: TranscriptionLogProb[];
  type: string;
}
