/**
 * OpenAI Realtime API Response Create Types
 * Based exactly on the response.create event documentation
 */

import { ConversationItem } from './clientConversationItemCreateTypes';
import {
  PCMAudioFormat,
  PCMUAudioFormat,
  PCMAAudioFormat,
  FunctionTool,
  MCPTool,
  FunctionToolChoice,
  MCPToolChoice,
  Prompt
} from '../secrets/createClientSecret';

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
// RESPONSE CONFIGURATION
// ============================================================================

export interface ResponseConfiguration {
  audio?: ResponseAudio;
  conversation?: string;
  input?: ConversationItem[];
  instructions?: string;
  max_output_tokens?: number | string;
  metadata?: Record<string, string>;
  output_modalities?: string[];
  prompt?: Prompt;
  tool_choice?: string | FunctionToolChoice | MCPToolChoice;
  tools?: (FunctionTool | MCPTool)[];
}

// ============================================================================
// RESPONSE CREATE EVENT
// ============================================================================

export interface ResponseCreateEvent {
  type: string;
  event_id?: string;
  response: ResponseConfiguration;
}
