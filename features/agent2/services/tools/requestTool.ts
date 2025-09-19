import type { Session } from '../../sessions/session';
import type { Tool } from '../../../shared/lib/database/types/tools';
import { buildToolResponse } from './helpers/response-builder';

/**
 * Request tool - inject requested tool into session
 */
export async function requestTool(
  args: { tool_name: string; reason?: string },
  session: Session,
  tool: Tool
) {
  try {
    const { tool_name } = args;

    // Find the requested tool in available tools
    const requestedTool = session.availableTools?.find(t => t.name === tool_name);
    if (!requestedTool) {
      return buildToolResponse(tool, null, `${tool_name} does not exist`);
    }

    // Check if tool is already active
    const isAlreadyActive = session.activeTools?.includes(tool_name);
    if (isAlreadyActive) {
      return buildToolResponse(tool, { tool_name, available: true }, `${tool_name} already available`);
    }

    // Update session state and inject the tool
    // TODO: Implement stage management logic here

    return buildToolResponse(tool, { tool_name, available: true }, `${tool_name} ready`);

  } catch (error) {
    // Internal system errors should still throw
    throw error;
  }
}
