import type { Session, ConversationState } from '../../sessions/session';
import type { Tool } from '../../../shared/lib/database/types/tools';
import type { QuoteRequestData } from '../../../scheduling/lib/types/booking-domain';
import { buildToolResponse } from './helpers/response-builder';

// Import tool functions
import { getServiceDetails } from './getServiceDetails';
import { getQuote } from './getQuote';
import { checkDayAvailability } from './checkDayAvailability';
import { createUser } from './createUser';
import { createBooking } from './createBooking';

/**
 * Thin ToolCoordinator - handles progressive injection and tool routing
 * Keeps session management separate from tool execution
 */
export class ToolCoordinator {

  /**
   * Execute a tool function with session injection
   */
  async executeToolFunction(
    toolName: string,
    args: Record<string, unknown>,
    session: Session,
    tool: Tool
  ): Promise<Record<string, unknown>> {
    try {
      switch (toolName) {
        case 'get_service_details':
          return await getServiceDetails(args as { service_name: string }, session, tool);

        case 'get_quote':
          return await getQuote(args as unknown as QuoteRequestData & { service_id: string }, session, tool);

        case 'check_day_availability':
          return await checkDayAvailability(
            args as { date: string; quote_total_estimate_time_minutes: number },
            session,
            tool
          );

        case 'create_user':
          return await createUser(
            args as { first_name: string; last_name?: string; email?: string },
            session,
            tool
          );

        case 'create_booking':
          return await createBooking(
            args as { preferred_date: string; preferred_time: string; quote_id: string; confirmation_message?: string },
            session,
            tool
          );

        default:
          return buildToolResponse(tool, null, `Unknown tool: ${toolName}`);
      }
    } catch (error) {
      // Internal system errors - let them bubble up for proper error handling
      throw error;
    }
  }

  /**
   * Get next tools to inject based on conversation state
   * Progressive tool injection logic
   */
  getNextToolsForState(currentState: ConversationState): string[] {
    switch (currentState) {
      case 'service_selection':
        return ['get_service_details', 'get_quote'];

      case 'quoting':
        return ['get_quote', 'check_day_availability'];

      case 'availability':
        return ['check_day_availability', 'create_user'];

      case 'user_management':
        return ['create_user', 'create_booking'];

      case 'booking':
        return ['create_booking'];

      case 'completed':
        return [];

      default:
        return ['get_service_details'];
    }
  }
}
