/**
 * OpenAI Realtime API Server Response MCP Call Failed Types
 * Based exactly on the response.mcp_call.failed server event documentation
 */

// ============================================================================
// SERVER RESPONSE MCP CALL FAILED EVENT
// ============================================================================

export interface ServerResponseMcpCallFailedEvent {
  event_id: string;
  item_id: string;
  output_index: number;
  type: string;
}
