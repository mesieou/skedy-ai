/**
 * OpenAI Realtime API Server Response MCP Call In Progress Types
 * Based exactly on the response.mcp_call.in_progress server event documentation
 */

// ============================================================================
// SERVER RESPONSE MCP CALL IN PROGRESS EVENT
// ============================================================================

export interface ServerResponseMcpCallInProgressEvent {
  event_id: string;
  item_id: string;
  output_index: number;
  type: string;
}
