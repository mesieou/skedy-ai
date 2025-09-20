import type { Session, ConversationState } from '../sessions/session';
import type { QuoteRequestData } from '../../scheduling/lib/types/booking-domain';
import { buildToolResponse } from './helpers/responseBuilder';
import { sentry } from '@/features/shared/utils/sentryService';

// Import tool functions
import { getServiceDetails } from './tools/getServiceDetails';
import { getQuote } from './tools/getQuote';
import { checkDayAvailability } from './tools/checkDayAvailability';
import { createUser } from './tools/createUser';
import { createBooking } from './tools/createBooking';
import { requestTool } from './tools/requestTool';

/**
 * Execute tool function and update session state
 */
export async function executeToolFunction(
  toolName: string,
  args: Record<string, unknown>,
  session: Session
): Promise<Record<string, unknown>> {
  const startTime = Date.now();

  try {
    // Add breadcrumb for tool execution start
    sentry.addBreadcrumb(`Executing tool ${toolName}`, 'tool-execution', {
      sessionId: session.id,
      businessId: session.businessId,
      toolName: toolName,
      conversationState: session.conversationState,
      argsKeys: Object.keys(args)
    });

    // Find the tool
    const tool = session.availableTools?.find(t => t.name === toolName);
    if (!tool) {
      const errorResult = {
        success: false,
        error: `${toolName} unavailable`,
        message: "Tool not configured for your business."
      };

      // Track tool not found error
      sentry.trackError(new Error(`Tool not found: ${toolName}`), {
        sessionId: session.id,
        businessId: session.businessId,
        operation: 'tool_execution_not_found',
        metadata: {
          toolName: toolName,
          availableTools: session.availableTools?.map(t => t.name) || [],
          conversationState: session.conversationState
        }
      });

      return errorResult;
    }

    // State progression and active tools mapping
    const stateMap: Record<string, ConversationState> = {
      'get_service_details': 'quoting',
      'get_quote': 'availability',
      'check_day_availability': 'user_management',
      'create_user': 'booking',
      'create_booking': 'completed'
    };

    const stageTools: Record<ConversationState, string[]> = {
      'service_selection': ['get_service_details'],
      'quoting': ['get_quote'],
      'availability': ['check_day_availability'],
      'user_management': ['create_user'],
      'booking': ['create_booking'],
      'completed': []
    };

    let result: Record<string, unknown>;

    // Execute tool
    switch (toolName) {
      case 'get_service_details':
        result = await getServiceDetails(args as { service_name: string }, session, tool);
        break;
      case 'get_quote':
        result = await getQuote(args as unknown as QuoteRequestData & { service_id: string }, session, tool);
        break;
      case 'check_day_availability':
        result = await checkDayAvailability(
          args as { date: string; quote_total_estimate_time_minutes: number },
          session,
          tool
        );
        break;
      case 'create_user':
        result = await createUser(
          args as { first_name: string; last_name?: string; email?: string },
          session,
          tool
        );
        break;
      case 'create_booking':
        result = await createBooking(
          args as { preferred_date: string; preferred_time: string; quote_id: string; confirmation_message?: string },
          session,
          tool
        );
        break;
      case 'request_tool':
        result = await requestTool(args as { tool_name: string; reason?: string }, session, tool);
        break;
      default:
        result = buildToolResponse(tool, null, `Unknown tool: ${toolName}`);

        // Track unknown tool error
        sentry.trackError(new Error(`function called from Unknown tool: ${toolName}`), {
          sessionId: session.id,
          businessId: session.businessId,
          operation: 'tool_execution_unknown',
          metadata: {
            toolName: toolName,
            availableTools: session.availableTools?.map(t => t.name) || []
          }
        });
    }

    // Update state and active tools after execution
    if (stateMap[toolName]) {
      const oldState = session.conversationState;
      session.conversationState = stateMap[toolName];
      const newStageTools = stageTools[stateMap[toolName]] || [];
      session.activeTools = [...newStageTools, 'request_tool'];

      // Add breadcrumb for state transition
      sentry.addBreadcrumb(`Conversation state updated`, 'tool-execution', {
        sessionId: session.id,
        toolName: toolName,
        oldState: oldState,
        newState: session.conversationState,
        activeTools: session.activeTools
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
        conversationState: session.conversationState,
        argsKeys: Object.keys(args),
        errorName: (error as Error).name
      }
    });

    throw error;
  }
}
