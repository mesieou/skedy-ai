import type { Session } from '../sessions/session';
import type { QuoteRequestData } from '../../scheduling/lib/types/booking-domain';
import { buildToolResponse } from './helpers/responseBuilder';
import { sentry } from '@/features/shared/utils/sentryService';
import assert from 'assert';

// Import tool functions
import { getServiceDetails } from './tools/getServiceDetails';
import { getQuote } from './tools/getQuote';
import { checkDayAvailability } from './tools/checkDayAvailability';
import { createUser } from './tools/createUser';
import { createBooking } from './tools/createBooking';
import { requestTool } from './tools/requestTool';
import { sendSMSBookingConfirmationTool } from './tools/sendSMSBookingConfirmationTool';

/**
 * Execute tool function and update session state
 */
export async function executeToolFunction(
  toolName: string,
  args: Record<string, unknown>,
  session: Session
): Promise<Record<string, unknown>> {
  assert(toolName && typeof toolName === 'string', 'executeToolFunction: toolName must be a non-empty string');
  assert(args && typeof args === 'object', 'executeToolFunction: args must be an object');
  assert(session && session.id, 'executeToolFunction: session must have an id');
  assert(session.businessId, 'executeToolFunction: session must have a businessId');

  const startTime = Date.now();

  try {
    // Add breadcrumb for tool execution start
    sentry.addBreadcrumb(`Executing tool ${toolName}`, 'tool-execution', {
      sessionId: session.id,
      businessId: session.businessId,
      toolName: toolName,
      currentToolsCount: session.currentTools?.length || 0,
      argsKeys: Object.keys(args)
    });

    // Find the tool in currently available tools
    const tool = session.currentTools?.find(t => t.name === toolName);
    if (!tool) {
      const errorResult = {
        success: false,
        error: `${toolName} unavailable`,
        message: "Tool not currently available. Use 'request_tool' to request additional tools."
      };

      // Track tool not found error
      sentry.trackError(new Error(`Tool not found: ${toolName}`), {
        sessionId: session.id,
        businessId: session.businessId,
        operation: 'tool_execution_not_found',
        metadata: {
          toolName: toolName,
          currentTools: session.currentTools?.map(t => t.name) || [],
          allAvailableTools: session.allAvailableToolNames
        }
      });

      return errorResult;
    }

    let result: Record<string, unknown>;

    // Execute tool
    switch (toolName) {
      case 'get_service_details':
        result = await getServiceDetails(args as { service_name: string }, session);
        break;
      case 'get_quote':
        result = await getQuote(args as unknown as QuoteRequestData & { service_id: string }, session);
        break;
      case 'check_day_availability':
        result = await checkDayAvailability(
          args as { date: string; quote_total_estimate_time_minutes: number },
          session
        );
        break;
      case 'create_user':
        result = await createUser(
          args as { first_name: string; last_name?: string; phone_number: string },
          session
        );
        break;
      case 'create_booking':
        result = await createBooking(
          args as { preferred_date: string; preferred_time: string; quote_id: string; confirmation_message?: string },
          session
        );
        break;
      case 'request_tool':
        result = await requestTool(args as { tool_name: string; service_name?: string; reason?: string }, session);
        break;
      case 'send_sms_booking_confirmation':
        result = await sendSMSBookingConfirmationTool(
          args as { preferred_date: string; preferred_time: string; confirmation_message?: string },
          session
        );
        break;
      default:
        result = buildToolResponse(null, `Unknown tool: ${toolName}`, false);

        // Track unknown tool error
        sentry.trackError(new Error(`function called from Unknown tool: ${toolName}`), {
          sessionId: session.id,
          businessId: session.businessId,
          operation: 'tool_execution_unknown',
        metadata: {
          toolName: toolName,
          currentTools: session.currentTools?.map(t => t.name) || []
        }
        });
    }

    const duration = Date.now() - startTime;

    // Add success breadcrumb
    sentry.addBreadcrumb(`Tool execution completed successfully`, 'tool-execution', {
      sessionId: session.id,
      toolName: toolName,
      duration: duration,
      resultSuccess: (result as { success?: boolean }).success !== false
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Track tool execution error
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'tool_execution_error',
      metadata: {
        toolName: toolName,
        duration: duration,
        currentToolsCount: session.currentTools?.length || 0,
        argsKeys: Object.keys(args),
        errorName: (error as Error).name
      }
    });

    throw error;
  }
}
