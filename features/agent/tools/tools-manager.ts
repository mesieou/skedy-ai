/**
 * Tools Manager
 *
 * Simple router for all agent function calls
 * Routes to appropriate business domain tools
 */

import type { BusinessContext } from '../../shared/lib/database/types/business-context';
import type { Business } from '../../shared/lib/database/types/business';
import type { FunctionCallResult, QuoteFunctionArgs } from './types';
import { QuoteTool } from './scheduling/quote';

export class ToolsManager {
  private quoteTool: QuoteTool;

  constructor(businessContext: BusinessContext, business: Business) {
    this.quoteTool = new QuoteTool(businessContext, business);
  }

  /**
   * Main function router - simple switch statement
   */
  async executeFunction(functionName: string, args: QuoteFunctionArgs): Promise<FunctionCallResult> {
    console.log(`🔧 Routing function: ${functionName}`);

    switch (functionName) {
      case 'get_quote':
        return this.quoteTool.getQuote(args);

      // Future functions:
      // case 'check_availability':
      //   return this.availabilityTool.checkAvailability(args);
      // case 'make_booking':
      //   return this.bookingTool.makeBooking(args);

      default:
        return this.createErrorResult(
          "Unknown function",
          `Sorry, I don't know how to handle: ${functionName}`
        );
    }
  }

  private createErrorResult(error: string, message: string): FunctionCallResult {
    return { success: false, error, message };
  }
}
