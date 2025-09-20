/**
 * OpenAI Realtime API Session Update Types
 * Based exactly on the session.update event documentation
 */

import {
  Audio,
  FunctionTool,
  MCPTool,
  FunctionToolChoice,
  MCPToolChoice,
  Prompt,
  TracingConfiguration,
  RetentionRatioTruncation
} from '../secrets/createClientSecret';

// ============================================================================
// SESSION UPDATE EVENT TYPES
// ============================================================================

export interface RealtimeSessionUpdate {
  type: string;
  audio?: Audio;
  include?: string[];
  instructions?: string;
  max_output_tokens?: number | string;
  model?: string;
  output_modalities?: string[];
  prompt?: Prompt;
  tool_choice?: string | FunctionToolChoice | MCPToolChoice;
  tools?: (FunctionTool | MCPTool)[];
  tracing?: string | TracingConfiguration;
  truncation?: string | RetentionRatioTruncation;
}

export interface RealtimeTranscriptionSessionUpdate {
  type: string;
  audio?: Audio;
  include?: string[];
}

export interface SessionUpdateEvent {
  type: string;
  event_id?: string;
  session: RealtimeSessionUpdate | RealtimeTranscriptionSessionUpdate;
}
