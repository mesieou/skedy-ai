/**
 * OpenAI Realtime API Server Response Created Types
 * Based exactly on the response.created server event documentation
 */

import { ConversationItem } from './clientConversationItemCreateTypes';
import { PCMAudioFormat, PCMUAudioFormat, PCMAAudioFormat } from './clientTypes';

// ============================================================================
// RESPONSE AUDIO CONFIGURATION
// ============================================================================

export interface ResponseAudioOutput {
  format?: PCMAudioFormat | PCMUAudioFormat | PCMAAudioFormat;
  voice?: string;
}

export interface ResponseAudio {
  output?: ResponseAudioOutput;
}

// ============================================================================
// USAGE STATISTICS
// ============================================================================

export interface CachedTokensDetails {
  audio_tokens: number;
  image_tokens: number;
  text_tokens: number;
}

export interface InputTokenDetails {
  audio_tokens: number;
  cached_tokens: number;
  cached_tokens_details: CachedTokensDetails;
  image_tokens: number;
  text_tokens: number;
}

export interface OutputTokenDetails {
  audio_tokens: number;
  text_tokens: number;
}

export interface ResponseUsage {
  input_token_details: InputTokenDetails;
  input_tokens: number;
  output_token_details: OutputTokenDetails;
  output_tokens: number;
  total_tokens: number;
}

// ============================================================================
// STATUS DETAILS
// ============================================================================

export interface StatusError {
  code?: string;
  type: string;
}

export interface StatusDetails {
  error?: StatusError;
  reason?: string;
  type: string;
}

// ============================================================================
// RESPONSE RESOURCE
// ============================================================================

export interface ResponseResource {
  audio?: ResponseAudio;
  conversation_id?: string;
  id: string;
  max_output_tokens?: number | string;
  metadata?: Record<string, string>;
  object: string;
  output: ConversationItem[];
  output_modalities?: string[];
  status: string;
  status_details?: StatusDetails;
  usage?: ResponseUsage;
}

// ============================================================================
// SERVER RESPONSE CREATED EVENT
// ============================================================================

export interface ServerResponseCreatedEvent {
  event_id: string;
  response: ResponseResource;
  type: string;
}
