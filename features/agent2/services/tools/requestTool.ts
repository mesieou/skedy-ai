import type { Session } from '../../sessions/session';
import type { Tool } from '../../../shared/lib/database/types/tools';
import { buildToolResponse } from '../helpers/responseBuilder';
import { updateToolsToSession } from '../updateToolsToSession';
import { sentry } from '@/features/shared/utils/sentryService';

/**
 * Request tool - inject requested tool into session
 */
export async function requestTool(
  args: { tool_name: string; service_name?: string; reason?: string },
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
      currentActiveTools: session.currentTools?.map(t => t.name) || []
    });
    const { tool_name, service_name } = args;

    // Check if get_quote is requested without service_name
    if (tool_name === 'get_quote' && !service_name) {
      return buildToolResponse(tool, null, 'service_name is required when requesting get_quote tool. Please specify which service you need a quote for based on the customer conversation.');
    }

    // Check if tool exists in all available tool names
    if (!session.allAvailableToolNames?.includes(tool_name)) {
      return buildToolResponse(tool, null, `${tool_name} does not exist`);
    }

    // Check if tool is already active
    const isAlreadyActive = session.currentTools?.some(t => t.name === tool_name);
    if (isAlreadyActive) {
      return buildToolResponse(tool, { tool_name, available: true }, `${tool_name} already available`);
    }

    // Update session tools with the requested tool
    await updateToolsToSession(session, [tool_name], service_name);

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
        currentActiveTools: session.currentTools?.map(t => t.name) || [],
        currentToolsCount: session.currentTools?.length || 0,
        errorName: (error as Error).name
      }
    });

    // Internal system errors should still throw
    throw error;
  }
}
