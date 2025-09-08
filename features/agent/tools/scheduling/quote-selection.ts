/**
 * Quote Selection Tool
 *
 * Handles customer selection between multiple generated quotes:
 * - Lists available quotes for customer choice
 * - Processes customer selection
 * - Sets selected quote in call context
 */

import type { CallContextManager } from '../../memory/call-context-manager';
import type { FunctionCallResult } from '../types';
import { createToolError } from '../../../shared/utils/error-utils';

export interface SelectQuoteFunctionArgs {
  quote_choice?: string; // Optional - if not provided, returns all quotes for selection
}

export class QuoteSelectionTool {
  private readonly callContextManager: CallContextManager;

  constructor(callContextManager: CallContextManager) {
    this.callContextManager = callContextManager;
  }

  /**
   * Handle quote selection - returns all quotes if no choice provided, selects quote if choice provided
   */
  async selectQuote(args: SelectQuoteFunctionArgs, callId: string): Promise<FunctionCallResult> {
    try {
      // Get all available quotes
      const allQuotes = await this.callContextManager.getAllQuotes(callId);

      if (allQuotes.length === 0) {
        return createToolError("No quotes available", "Please get a quote first.");
      }

      // If no quote_choice provided, return all quotes for AI to present safely
      if (!args.quote_choice) {
        return this.formatAllQuotesForAISafety(allQuotes as unknown as Array<{
          quoteId: string;
          quoteRequestData: Record<string, unknown>;
          quoteResultData: Record<string, unknown> & {
            total_estimate_time_in_minutes: number;
            total_estimate_amount: number;
            deposit_amount?: number;
          };
          timestamp: number;
        }>);
      }
      // Find the best matching quote based on customer's choice
      const selectedQuoteId = this.matchCustomerChoice(args.quote_choice, allQuotes as unknown as Array<{
        quoteId: string;
        quoteRequestData: Record<string, unknown>;
        quoteResultData: Record<string, unknown> & {
          total_estimate_amount: number;
        };
        timestamp: number;
      }>);

      if (!selectedQuoteId) {
        return createToolError(
          "Quote selection unclear",
          "Could you clarify which quote option you'd prefer?"
        );
      }

      // Select the quote
      await this.callContextManager.selectQuote(callId, selectedQuoteId);

      const selectedQuote = allQuotes.find(q => q.quoteId === selectedQuoteId);
      if (!selectedQuote) {
        return createToolError("Quote not found", "Selected quote is no longer available.");
      }

      const quantity = selectedQuote.quoteRequestData.services[0]?.quantity || 1;

      return {
        success: true,
        data: {
          selected_quote_id: selectedQuoteId,
          total_amount: selectedQuote.quoteResultData.total_estimate_amount,
          quantity: quantity,
          estimated_time: selectedQuote.quoteResultData.total_estimate_time_in_minutes
        },
        message: `Perfect! I've selected your quote for AUD ${selectedQuote.quoteResultData.total_estimate_amount}. Ready to book this?`
      };

    } catch (error) {
      console.error('❌ [QuoteSelectionTool] Quote operation failed:', error);
      return createToolError(
        "Quote operation failed",
        "Sorry, I couldn't process your request. Please try again."
      );
    }
  }

  /**
   * Format all quotes with complete information for AI safety and accuracy
   */
  private formatAllQuotesForAISafety(allQuotes: Array<{
    quoteId: string;
    quoteRequestData: Record<string, unknown>;
    quoteResultData: Record<string, unknown> & {
      total_estimate_time_in_minutes: number;
      total_estimate_amount: number;
      deposit_amount?: number;
    };
    timestamp: number;
  }>): FunctionCallResult {
    const formattedQuotes = allQuotes.map((quote, index) => {
      const request = quote.quoteRequestData;
      const result = quote.quoteResultData;
      const quantity = (request as { services?: Array<{ quantity?: number }> }).services?.[0]?.quantity || 1;
      const hours = Math.round(result.total_estimate_time_in_minutes / 60 * 10) / 10;

      return {
        option_number: index + 1,
        quote_id: quote.quoteId,
        total_amount: result.total_estimate_amount,
        estimated_time_hours: hours,
        deposit_amount: result.deposit_amount || 0,
        quantity: quantity,
        key_parameters: this.extractKeyDifferences(request)
      };
    });

    // Sort by price for consistent presentation
    formattedQuotes.sort((a, b) => a.total_amount - b.total_amount);

    return {
      success: true,
      data: {
        quote_count: allQuotes.length,
        quotes: formattedQuotes,
        instruction: "Present these options clearly with key differences. Let customer choose naturally."
      },
      message: `I have ${allQuotes.length} quote options ready. Use this data to present them clearly and help the customer choose.`
    };
  }

  /**
   * Extract key differentiating parameters for AI presentation
   */
  private extractKeyDifferences(request: Record<string, unknown>): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    if (request.number_of_people) params.people = request.number_of_people;
    if (request.number_of_rooms) params.rooms = request.number_of_rooms;
    if (request.job_scope) params.job_scope = request.job_scope;
    if (request.square_meters) params.square_meters = request.square_meters;
    return params;
  }

  /**
   * Match customer choice to available quotes
   */
  private matchCustomerChoice(
    choice: string,
    quotes: Array<{
      quoteId: string;
      quoteRequestData: Record<string, unknown>;
      quoteResultData: Record<string, unknown> & {
        total_estimate_amount: number;
      };
      timestamp: number;
    }>
  ): string | null {
    const lowerChoice = choice.toLowerCase();

    // Sort quotes by price (ascending) to match "cheaper"/"expensive" choices
    const sortedByPrice = [...quotes].sort((a, b) =>
      a.quoteResultData.total_estimate_amount - b.quoteResultData.total_estimate_amount
    );

    // Sort quotes by timestamp (newest first) to match "first"/"second" choices
    const sortedByTime = [...quotes].sort((a, b) => b.timestamp - a.timestamp);

    // Price-based matching
    if (lowerChoice.includes('cheap') || lowerChoice.includes('lower') || lowerChoice.includes('less')) {
      return sortedByPrice[0]?.quoteId || null;
    }

    if (lowerChoice.includes('expensive') || lowerChoice.includes('higher') || lowerChoice.includes('more')) {
      return sortedByPrice[sortedByPrice.length - 1]?.quoteId || null;
    }

    // Ordinal/positional matching (service-agnostic)
    if (lowerChoice.includes('first') || lowerChoice.includes('1st')) {
      return sortedByTime[0]?.quoteId || null;
    }

    if (lowerChoice.includes('second') || lowerChoice.includes('2nd')) {
      return sortedByTime[1]?.quoteId || null;
    }

    if (lowerChoice.includes('third') || lowerChoice.includes('3rd')) {
      return sortedByTime[2]?.quoteId || null;
    }

    // Generic number matching (1, 2, 3) - use chronological order
    if (lowerChoice.includes('one') || lowerChoice.match(/\b1\b/)) {
      return sortedByTime[0]?.quoteId || null;
    }

    if (lowerChoice.includes('two') || lowerChoice.match(/\b2\b/)) {
      return sortedByTime[1]?.quoteId || null;
    }

    if (lowerChoice.includes('three') || lowerChoice.match(/\b3\b/)) {
      return sortedByTime[2]?.quoteId || null;
    }

    // Fallback: return the most recent quote
    return sortedByTime[0]?.quoteId || null;
  }
}
