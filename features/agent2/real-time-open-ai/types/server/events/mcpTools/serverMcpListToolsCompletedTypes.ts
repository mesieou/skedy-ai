/**
 * OpenAI Realtime API Server MCP List Tools Completed Types
 * Based exactly on the mcp_list_tools.completed server event documentation
 */

// ============================================================================
// SERVER MCP LIST TOOLS COMPLETED EVENT
// ============================================================================

export interface ServerMcpListToolsCompletedEvent {
  event_id: string;
  item_id: string;
  type: string;
}
