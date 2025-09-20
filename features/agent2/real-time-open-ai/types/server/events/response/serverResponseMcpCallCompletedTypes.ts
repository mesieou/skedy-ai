/**
 * OpenAI Realtime API Server Response MCP Call Completed Types
 * Based exactly on the response.mcp_call.completed server event documentation
 */

// ============================================================================
// SERVER RESPONSE MCP CALL COMPLETED EVENT
// ============================================================================

export interface ServerResponseMcpCallCompletedEvent {
  event_id: string;
  item_id: string;
  output_index: number;
  type: string;
}
