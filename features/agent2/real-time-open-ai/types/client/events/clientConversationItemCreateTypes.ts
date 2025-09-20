/**
 * OpenAI Realtime API Conversation Item Create Types
 * Based exactly on the conversation.item.create event documentation
 */

// ============================================================================
// CONVERSATION ITEM CONTENT TYPES
// ============================================================================

export interface SystemMessageContent {
  text: string;
  type: string;
}

export interface UserMessageContent {
  audio?: string;
  detail?: string;
  image_url?: string;
  text?: string;
  transcript?: string;
  type: string;
}

export interface AssistantMessageContent {
  audio?: string;
  text?: string;
  transcript?: string;
  type: string;
}

// ============================================================================
// MCP ERROR TYPES
// ============================================================================

export interface RealtimeMCPProtocolError {
  code: number;
  message: string;
  type: string;
}

export interface RealtimeMCPToolExecutionError {
  message: string;
  type: string;
}

export interface RealtimeMCPHTTPError {
  code: number;
  message: string;
  type: string;
}

export interface MCPToolInfo {
  input_schema: Record<string, unknown>;
  name: string;
  annotations?: Record<string, unknown>;
  description?: string;
}

// ============================================================================
// CONVERSATION ITEM TYPES
// ============================================================================

export interface RealtimeSystemMessageItem {
  content: SystemMessageContent[];
  role: string;
  type: string;
  id?: string;
  object?: string;
  status?: string;
}

export interface RealtimeUserMessageItem {
  content: UserMessageContent[];
  role: string;
  type: string;
  id?: string;
  object?: string;
  status?: string;
}

export interface RealtimeAssistantMessageItem {
  content: AssistantMessageContent[];
  role: string;
  type: string;
  id?: string;
  object?: string;
  status?: string;
}

export interface RealtimeFunctionCallItem {
  arguments: string;
  name: string;
  type: string;
  call_id: string;
  id?: string;
  object?: string;
  status?: string;
}

export interface RealtimeFunctionCallOutputItem {
  call_id: string;
  output: string;
  type: string;
  id?: string;
  object?: string;
  status?: string;
}

export interface RealtimeMCPApprovalResponse {
  approval_request_id: string;
  approve: boolean;
  id: string;
  type: string;
  reason?: string;
}

export interface RealtimeMCPListTools {
  server_label: string;
  tools: MCPToolInfo[];
  type: string;
  id: string;
}

export interface RealtimeMCPToolCall {
  arguments: string;
  id: string;
  name: string;
  server_label: string;
  type: string;
  approval_request_id?: string;
  error?: RealtimeMCPProtocolError | RealtimeMCPToolExecutionError | RealtimeMCPHTTPError;
  output?: string;
}

export interface RealtimeMCPApprovalRequest {
  arguments: string;
  id: string;
  name: string;
  server_label: string;
  type: string;
}

// ============================================================================
// CONVERSATION ITEM CREATE EVENT
// ============================================================================

export type ConversationItem =
  | RealtimeSystemMessageItem
  | RealtimeUserMessageItem
  | RealtimeAssistantMessageItem
  | RealtimeFunctionCallItem
  | RealtimeFunctionCallOutputItem
  | RealtimeMCPApprovalResponse
  | RealtimeMCPListTools
  | RealtimeMCPToolCall
  | RealtimeMCPApprovalRequest;

export interface ConversationItemCreateEvent {
  type: string;
  event_id?: string;
  item: ConversationItem;
  previous_item_id?: string;
}
