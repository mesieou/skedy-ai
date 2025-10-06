import type { Session } from '../../sessions/session';
import { buildToolResponse } from '../helpers/responseBuilder';
import { sentry } from '@/features/shared/utils/sentryService';

/**
 * Select a quote from the quotes array - allows customer to choose which quote to proceed with
 */
export async function selectQuote(
  args: {
    quote_id: string;
  },
  session: Session
) {
  const startTime = Date.now();

  try {
    // Add breadcrumb for quote selection
    sentry.addBreadcrumb(`Selecting quote`, 'tool-select-quote', {
      sessionId: session.id,
      businessId: session.businessId,
      quoteId: args.quote_id,
      totalQuotes: session.quotes.length
    });

    // Check if there are any quotes available
    if (session.quotes.length === 0) {
      return buildToolResponse(null, `No quotes available. Please get a quote first.`, false);
    }

    // Find the quote by ID
    const selectedQuoteData = session.quotes.find(q => q.result.quote_id === args.quote_id);
    if (!selectedQuoteData) {
      // List available quotes for better UX
      const availableQuotes = session.quotes.map((q, index) => ({
        quote_id: q.result.quote_id,
        service_name: q.request.services[0]?.service?.name || `Quote ${index + 1}`,
        total_amount: q.result.total_estimate_amount,
        deposit_amount: q.result.deposit_amount
      }));

      return buildToolResponse(
        { available_quotes: availableQuotes },
        `Quote not found: ${args.quote_id}. Select one of the available quotes: ${availableQuotes.map(q => `${q.quote_id} ($${q.total_amount})`).join(', ')}`,
        false
      );
    }

    // Set as selected quote with proper request data
    session.selectedQuote = selectedQuoteData;

    // Create payment state if business requires deposit
    if (selectedQuoteData.result.deposit_amount > 0) {
      session.depositPaymentState = {
        status: 'pending',
        quoteId: selectedQuoteData.result.quote_id,
        paymentLink: undefined, // Will be set when payment link is created
        amount: selectedQuoteData.result.deposit_amount,
        createdAt: Date.now()
      };
    }

    const duration = Date.now() - startTime;

    // Success breadcrumb
    sentry.addBreadcrumb(`Quote selected successfully`, 'tool-select-quote', {
      sessionId: session.id,
      businessId: session.businessId,
      quoteId: args.quote_id,
      totalAmount: selectedQuoteData.result.total_estimate_amount,
      depositAmount: selectedQuoteData.result.deposit_amount,
      duration: duration
    });

    return buildToolResponse(
      null,
      `Great choice!`,
      true
    );

  } catch (error) {
    const duration = Date.now() - startTime;

    // Track quote selection error
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'tool_select_quote',
      metadata: {
        duration: duration,
        quoteId: args.quote_id,
        totalQuotes: session.quotes.length,
        errorName: (error as Error).name
      }
    });

    // Internal system errors should still throw
    throw error;
  }
}
