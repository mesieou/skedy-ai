import { StripePaymentService } from '@/features/payments';
import type { Session } from '@/features/agent/sessions/session';
import { buildToolResponse } from '@/features/agent/services/helpers/responseBuilder';
import { sentry } from '@/features/shared/utils/sentryService';
import { BookingNotifications } from '@/features/notifications/booking-notifications';
import { DateUtils } from '@/features/shared/utils/date-utils';

/**
 * Create payment link for a quote - integrates with skedy-ai quote system
 */
export async function createAndSendPaymentLink(
  args: {
    preferred_date: string;
    preferred_time: string;
    user_id: string;
    selected_quote_id: string;
  },
  session: Session
) {
  const startTime = Date.now();

  try {
    // Validate date format using DateUtils
    if (!DateUtils.isValidDateFormat(args.preferred_date)) {
      return buildToolResponse(null, `Invalid date format. Please use YYYY-MM-DD format.`, false);
    }

    // Validate time format using DateUtils
    if (!DateUtils.isValidTimeFormat(args.preferred_time)) {
      return buildToolResponse(null, `Invalid time format. Please use HH:MM format (24-hour).`, false);
    }

    // Validate user exists in session
    if (!args.user_id) {
      return buildToolResponse(null, `No customer data found. Please create a customer profile first.`, false);
    }

    // Check if there are any quotes available
    if (!args.selected_quote_id) {
      return buildToolResponse(null, `No quotes available. Please get a quote first.`, false);
    }
    const quote = session.quotes.find(q => q.result.quote_id === args.selected_quote_id);

    if (!quote) {
      return buildToolResponse(null, `Quote not found. Please select a quote first.`, false);
    }

    session.selectedQuote = quote;
    const quoteId = quote.result.quote_id;

    // Add breadcrumb for payment link creation
    sentry.addBreadcrumb(`Creating payment link`, 'tool-create-payment-link', {
      sessionId: session.id,
      businessId: session.businessId,
      quoteId: quoteId
    });

    // Log detailed information before creating payment link
    console.log(`💳 [PaymentLink] Creating payment link for session: ${session.id}`);
    console.log(`💳 [PaymentLink] Business: ${session.businessEntity.name} (${session.businessEntity.id})`);
    console.log(`💳 [PaymentLink] Quote ID: ${quoteId}`);
    console.log(`💳 [PaymentLink] Deposit amount: $${quote.result.deposit_amount}`);
    console.log(`💳 [PaymentLink] User ID: ${args.user_id}`);
    console.log(`💳 [PaymentLink] Business Stripe account: ${session.businessEntity.stripe_connect_account_id || 'NOT SET'}`);
    console.log(`💳 [PaymentLink] Business payment methods: ${JSON.stringify(session.businessEntity.payment_methods)}`);

    // Create payment link using the payment utility
    const result = await StripePaymentService.createPaymentLinkForSession(session);
    session.depositPaymentState!.paymentLink = result.paymentLink;
    const quoteResult = quote.result;
    const duration = Date.now() - startTime;

    if (!result.success) {
      // Track payment link creation error
      sentry.trackError(new Error(result.error || 'Payment link creation failed'), {
        sessionId: session.id,
        businessId: session.businessId,
        operation: 'tool_create_payment_link',
        metadata: {
          duration: duration,
          quoteId: quoteId,
          errorMessage: result.error
        }
      });

      return buildToolResponse(null, 'Sorry, a system error occurred with the payment link. We will contact you shortly.', false);
    }

    // Payment state is already updated by the utility

    // Send payment link via SMS with the provided preferred date/time
    const notificationResult = await BookingNotifications.sendPaymentLink(session, args.preferred_date, args.preferred_time);
    if (!notificationResult.success) {
      console.warn(`⚠️ Payment link created but SMS failed: ${notificationResult.error}`);
    }

    // Success breadcrumb
    sentry.addBreadcrumb(`Payment link created successfully`, 'tool-create-payment-link', {
      sessionId: session.id,
      businessId: session.businessId,
      quoteId: quoteId,
      duration: duration,
      depositAmount: quoteResult.deposit_amount
    });

    return buildToolResponse(
      { paymentLink: result.paymentLink },
      `We just sent a payment link for the deposit of $${quoteResult.deposit_amount} (all fees included). Please complete the payment to proceed with booking.`,
      true
    );

  } catch (error) {
    const duration = Date.now() - startTime;

    // Track payment link creation error
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'tool_create_payment_link',
      metadata: {
        duration: duration,
        errorName: (error as Error).name
      }
    });

    // Internal system errors should still throw (database issues, Stripe API failures, etc.)
    throw error;
  }
}
