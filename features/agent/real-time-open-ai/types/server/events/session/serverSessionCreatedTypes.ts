/**
 * OpenAI Realtime API Server Session Created Types
 * Based exactly on the session.created server event documentation
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
} from '../../../client/secrets/createClientSecret';

// ============================================================================
// SERVER SESSION CREATED EVENT
// ============================================================================

export interface ServerRealtimeSessionConfiguration {
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

export interface ServerRealtimeTranscriptionSessionConfiguration {
  type: string;
  audio?: Audio;
  include?: string[];
}

export interface ServerSessionCreatedEvent {
  event_id: string;
  session: ServerRealtimeSessionConfiguration | ServerRealtimeTranscriptionSessionConfiguration;
  type: string;
}
