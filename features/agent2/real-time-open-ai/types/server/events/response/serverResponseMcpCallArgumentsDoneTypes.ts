/**
 * OpenAI Realtime API Server Response MCP Call Arguments Done Types
 * Based exactly on the response.mcp_call_arguments.done server event documentation
 */

// ============================================================================
// SERVER RESPONSE MCP CALL ARGUMENTS DONE EVENT
// ============================================================================

export interface ServerResponseMcpCallArgumentsDoneEvent {
  arguments: string;
  event_id: string;
  item_id: string;
  output_index: number;
  response_id: string;
  type: string;
}
