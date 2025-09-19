import type { Session, ConversationState } from '../sessions/session';
import type { QuoteRequestData } from '../../scheduling/lib/types/booking-domain';
import { buildToolResponse } from './helpers/responseBuilder';

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
  try {
    // Find the tool
    const tool = session.availableTools?.find(t => t.name === toolName);
    if (!tool) {
      return {
        success: false,
        error: `${toolName} unavailable`,
        message: "Tool not configured for your business."
      };
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
    }

    // Update state and active tools after execution
    if (stateMap[toolName]) {
      session.conversationState = stateMap[toolName];
      const newStageTools = stageTools[stateMap[toolName]] || [];
      session.activeTools = [...newStageTools, 'request_tool'];
    }

    return result;
  } catch (error) {
    throw error;
  }
}
