/**
 * OpenAI Realtime API Server MCP List Tools In Progress Types
 * Based exactly on the mcp_list_tools.in_progress server event documentation
 */

// ============================================================================
// SERVER MCP LIST TOOLS IN PROGRESS EVENT
// ============================================================================

export interface ServerMcpListToolsInProgressEvent {
  event_id: string;
  item_id: string;
  type: string;
}
