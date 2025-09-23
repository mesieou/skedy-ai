/**
 * OpenAI Realtime API Session Response Object
 * Response from creating a session and client secret for the Realtime API
 * Based exactly on the OpenAI API documentation
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
} from '../client/clientTypes';

// ============================================================================
// SESSION RESPONSE OBJECT
// ============================================================================

export interface ClientSecret {
  expires_at: number;
  value: string;
}

export interface RealtimeSessionResponseObject {
  client_secret: ClientSecret;
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

export interface RealtimeTranscriptionSessionResponseObject {
  id: string;
  object: string;
  type: string;
  audio?: Audio;
  expires_at: number;
  include?: string[];
}

export interface SessionResponseObject {
  expires_at: number;
  session: RealtimeSessionResponseObject | RealtimeTranscriptionSessionResponseObject;
}
