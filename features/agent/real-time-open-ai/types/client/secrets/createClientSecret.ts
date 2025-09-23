/**
 * OpenAI Realtime API Types
 * Based exactly on the OpenAI API documentation
 */

// ============================================================================
// CLIENT SECRET TYPES
// ============================================================================

export interface ClientSecretExpiresAfter {
  anchor?: string;
  seconds?: number;
}

export interface CreateClientSecretRequest {
  expires_after?: ClientSecretExpiresAfter;
  session?: SessionConfiguration;
}

// ============================================================================
// AUDIO FORMAT TYPES
// ============================================================================

export interface PCMAudioFormat {
  rate?: number;
  type?: string;
}

export interface PCMUAudioFormat {
  type?: string;
}

export interface PCMAAudioFormat {
  type?: string;
}

// ============================================================================
// AUDIO CONFIGURATION TYPES
// ============================================================================

export interface NoiseReduction {
  type?: string;
}

export interface Transcription {
  language?: string;
  model?: string;
  prompt?: string;
}

export interface ServerVAD {
  type: string;
  create_response?: boolean;
  idle_timeout_ms?: number;
  interrupt_response?: boolean;
  prefix_padding_ms?: number;
  silence_duration_ms?: number;
  threshold?: number;
}

export interface SemanticVAD {
  type: string;
  create_response?: boolean;
  eagerness?: string;
  interrupt_response?: boolean;
}

export interface InputAudio {
  format?: PCMAudioFormat | PCMUAudioFormat | PCMAAudioFormat;
  noise_reduction?: NoiseReduction;
  transcription?: Transcription;
  turn_detection?: ServerVAD | SemanticVAD;
}

export interface OutputAudio {
  format?: PCMAudioFormat | PCMUAudioFormat | PCMAAudioFormat;
  speed?: number;
  voice?: string;
}

export interface Audio {
  input?: InputAudio;
  output?: OutputAudio;
}

// ============================================================================
// TOOL TYPES
// ============================================================================

export interface FunctionTool {
  description?: string;
  name?: string;
  parameters?: Record<string, unknown>;
  type?: string;
}

export interface MCPToolFilter {
  read_only?: boolean;
  tool_names?: string[];
}

export interface MCPToolApproval {
  always?: MCPToolFilter;
  never?: MCPToolFilter;
}

export interface MCPTool {
  server_label: string;
  type: string;
  allowed_tools?: string[] | MCPToolFilter;
  authorization?: string;
  connector_id?: string;
  headers?: Record<string, string>;
  require_approval?: string | MCPToolApproval;
  server_description?: string;
  server_url?: string;
}

export interface FunctionToolChoice {
  name: string;
  type: string;
}

export interface MCPToolChoice {
  server_label: string;
  type: string;
  name?: string;
}

export interface Prompt {
  id: string;
  variables?: Record<string, unknown>;
  version?: string;
}

export interface RetentionRatioTruncation {
  retention_ratio: number;
  type: string;
}

export interface TracingConfiguration {
  group_id?: string;
  metadata?: Record<string, unknown>;
  workflow_name?: string;
}

// ============================================================================
// SESSION CONFIGURATION TYPES
// ============================================================================

export interface RealtimeSessionConfiguration {
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

export interface RealtimeTranscriptionSessionConfiguration {
  type: string;
  audio?: Audio;
  include?: string[];
}

export type SessionConfiguration = RealtimeSessionConfiguration | RealtimeTranscriptionSessionConfiguration;
