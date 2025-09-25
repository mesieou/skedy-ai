/**
 * Tool Interaction Tracker
 *
 * Shared logic for tracking tool executions in interactions
 * Used by both WebSocket (executeFunctionCall.ts) and API (demo-tool-execution) flows
 */

import type { Session } from '../../sessions/session';

export function trackToolExecution(
  session: Session,
  toolName: string,
  result: Record<string, unknown>
): void {
  // Only track if not first AI response (same logic as backend)
  if (!session.isFirstAiResponse) {
    // Find the tool in session for schema info
    const tool = session.currentTools?.find(t => t.name === toolName);
    if (tool) {
      // Store tool execution info for the current interaction
      session.pendingToolExecution = {
        name: toolName,
        result: JSON.stringify(result),
        schema: JSON.stringify(tool.function_schema),
        schemaVersion: tool.version
      };

      // Update the latest interaction if it exists
      const latestInteraction = session.interactions[session.interactions.length - 1];
      if (latestInteraction) {
        latestInteraction.generated_from_tool_calling = true;
        latestInteraction.tool_name = toolName;
        latestInteraction.tool_schema = JSON.stringify(tool.function_schema);
        latestInteraction.tool_schema_version = tool.version;
        latestInteraction.tool_result = JSON.stringify(result);
      }
    }
  }
}
