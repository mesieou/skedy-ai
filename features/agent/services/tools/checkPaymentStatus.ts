import type { Session } from '@/features/agent/sessions/session';
import { buildToolResponse } from '@/features/agent/services/helpers/responseBuilder';
import { sentry } from '@/features/shared/utils/sentryService';

/**
 * Check payment status for a quote - allows agent to check if deposit payment is completed
 */
export async function checkPaymentStatusTool(
  session: Session
) {
  const startTime = Date.now();

  try {
    // Validate that we have a selected quote
    if (!session.selectedQuote) {
      return buildToolResponse(null, `No quote selected. Please get a quote first.`, false);
    }

    const quoteId = session.selectedQuote.result.quote_id;

    // Add breadcrumb for payment status check
    sentry.addBreadcrumb(`Checking payment status`, 'tool-check-payment-status', {
      sessionId: session.id,
      businessId: session.businessId,
      quoteId: quoteId
    });

    const paymentState = session.depositPaymentState!;
    const duration = Date.now() - startTime;
    // Success breadcrumb
    sentry.addBreadcrumb(`Payment status checked`, 'tool-check-payment-status', {
      sessionId: session.id,
      businessId: session.businessId,
      quoteId: quoteId,
      paymentStatus: paymentState.status,
      duration: duration
    });

    // Return payment status information
    switch (paymentState.status) {
      case 'completed':
        return buildToolResponse(
          {
            payment_status: 'completed',
            quote_id: quoteId,
            amount: paymentState.amount,
            stripe_session_id: paymentState.stripeSessionId
          },
          `Payment completed successfully! You can now proceed with booking.`,
          true
        );

      case 'pending':
        return buildToolResponse(
          {
            payment_status: 'pending',
            quote_id: quoteId,
            amount: paymentState.amount,
            payment_link: paymentState.paymentLink
          },
          `Payment is still pending. Please complete the payment using the provided link sent to your phone.`,
          false
        );

      case 'failed':
        return buildToolResponse(
          {
            payment_status: 'failed',
            quote_id: quoteId,
            amount: paymentState.amount
          },
          `Payment failed. Please create a new payment link to try again.`,
          false
        );

      default:
        return buildToolResponse(
          null,
          `Unknown payment status for current quote.`,
          false
        );
    }

  } catch (error) {
    const duration = Date.now() - startTime;

    // Track payment status check error
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'tool_check_payment_status',
        metadata: {
          duration: duration,
          quoteId: session.selectedQuote?.result?.quote_id,
          errorName: (error as Error).name
        }
    });

    // Internal system errors should still throw
    throw error;
  }
}
