import type { Session } from '../../sessions/session';
import type { Tool } from '../../../shared/lib/database/types/tools';
import { buildToolResponse } from '../helpers/responseBuilder';
import { sentry } from '@/features/shared/utils/sentryService';

/**
 * Request tool - inject requested tool into session
 */
export async function requestTool(
  args: { tool_name: string; reason?: string },
  session: Session,
  tool: Tool
) {
  const startTime = Date.now();

  try {
    // Add breadcrumb for tool request start
    sentry.addBreadcrumb(`Requesting tool`, 'tool-request-tool', {
      sessionId: session.id,
      businessId: session.businessId,
      requestedToolName: args.tool_name,
      reason: args.reason,
      currentActiveTools: session.activeTools
    });
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

    const duration = Date.now() - startTime;

    // Success breadcrumb
    sentry.addBreadcrumb(`Tool request processed`, 'tool-request-tool', {
      sessionId: session.id,
      businessId: session.businessId,
      requestedToolName: args.tool_name,
      duration: duration,
      toolMadeAvailable: !isAlreadyActive
    });

    return buildToolResponse(tool, { tool_name, available: true }, `${tool_name} ready`);

  } catch (error) {
    const duration = Date.now() - startTime;

    // Track tool request error
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'tool_request_tool',
      metadata: {
        duration: duration,
        requestedToolName: args.tool_name,
        reason: args.reason,
        currentActiveTools: session.activeTools,
        availableToolsCount: session.availableTools?.length || 0,
        errorName: (error as Error).name
      }
    });

    // Internal system errors should still throw
    throw error;
  }
}
