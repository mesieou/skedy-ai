/**
 * OpenAI Realtime API Server MCP List Tools Failed Types
 * Based exactly on the mcp_list_tools.failed server event documentation
 */

// ============================================================================
// SERVER MCP LIST TOOLS FAILED EVENT
// ============================================================================

export interface ServerMcpListToolsFailedEvent {
  event_id: string;
  item_id: string;
  type: string;
}
