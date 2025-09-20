/**
 * OpenAI Realtime API Server Response MCP Call Arguments Delta Types
 * Based exactly on the response.mcp_call_arguments.delta server event documentation
 */

// ============================================================================
// SERVER RESPONSE MCP CALL ARGUMENTS DELTA EVENT
// ============================================================================

export interface ServerResponseMcpCallArgumentsDeltaEvent {
  delta: string;
  event_id: string;
  item_id: string;
  obfuscation?: string;
  output_index: number;
  response_id: string;
  type: string;
}
