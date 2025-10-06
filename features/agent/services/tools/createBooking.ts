import { BookingOrchestrator } from '../../../scheduling/lib/bookings/booking-orchestrator';
import type { Session } from '../../sessions/session';
import { buildToolResponse } from '../helpers/responseBuilder';
import { DateUtils } from '../../../shared/utils/date-utils';
import { sentry } from '@/features/shared/utils/sentryService';
import { BookingNotifications } from '../../../notifications/booking-notifications';

/**
 * Create booking - uses session injection for minimal dependencies
 */
export async function createBooking(
  args: {
    preferred_date: string;
    preferred_time: string;
    confirmation_message?: string;
  },
  session: Session
) {
  const startTime = Date.now();

  try {
    // Add breadcrumb for booking creation start
    sentry.addBreadcrumb(`Creating booking`, 'tool-create-booking', {
      sessionId: session.id,
      businessId: session.businessId,
      preferredDate: args.preferred_date,
      preferredTime: args.preferred_time,
      hasSelectedQuote: !!session.selectedQuote,
      selectedQuoteId: session.selectedQuote?.result?.quote_id
    });
    // Validate date format using DateUtils
    if (!DateUtils.isValidDateFormat(args.preferred_date)) {
      // User input error - invalid date format
      return buildToolResponse(null, `Invalid date format. Please use YYYY-MM-DD format.`, false);
    }

    // Validate time format using DateUtils
    if (!DateUtils.isValidTimeFormat(args.preferred_time)) {
      // User input error - invalid time format
      return buildToolResponse(null, `Invalid time format. Please use HH:MM format (24-hour).`, false);
    }

    // Validate date is not in the past - compare business dates directly
    const { date: todayInBusinessTimezone } = DateUtils.convertUTCToTimezone(DateUtils.nowUTC(), session.businessEntity.time_zone);

    if (args.preferred_date < todayInBusinessTimezone) {
      // User input error - past date
      return buildToolResponse(null, `Cannot book past dates. Please select a future date.`, false);
    }

    // Get selected quote and request from session
    if (!session.selectedQuote) {
      // User input error - no quote selected
      return buildToolResponse(null, `No quote selected. Please select a quote first using the selectQuote tool.`, false);
    }

    // Quote request data is now part of selectedQuote

    // Validate user exists in session
    if (!session.customerEntity) {
      // User input error - no user in session
      return buildToolResponse(null, `User profile required. Please create a user profile first.`, false);
    }

    // Check if payment is required and completed
    if (session.selectedQuote.result.deposit_amount > 0) {
     // Check if payment is completed
      if (session.depositPaymentState!.status !== 'completed') {
        return buildToolResponse(null, `Payment not completed. Please complete the deposit payment of $${session.depositPaymentState!.amount} before booking.`, false);
      }
    }

    // Use BookingOrchestrator for core booking creation (with original quote data)
    const bookingOrchestrator = new BookingOrchestrator();
    const result = await bookingOrchestrator.createBooking({
      quoteRequestData: session.selectedQuote.request,
      quoteResultData: session.selectedQuote.result,
      userId: session.customerEntity.id,
      preferredDate: args.preferred_date,
      preferredTime: args.preferred_time,
      depositPaymentState: session.depositPaymentState  // Pass payment state for proper booking creation
    });

    if (!result.success || !result.booking) {
      // User input error - booking failed (availability, etc.)
      return buildToolResponse(null, result.error || `Booking could not be created. We will contact you shortly.`, false);
    }

    // Convert booking UTC timestamps to business timezone for user display
    const { date: start_date, time: start_time } = DateUtils.convertUTCToTimezone(result.booking.start_at, session.businessEntity.time_zone);
    const { date: end_date, time: end_time } = DateUtils.convertUTCToTimezone(result.booking.end_at, session.businessEntity.time_zone);

    const start_at = `${start_date} ${start_time}`;
    const end_at = `${end_date} ${end_time}`;

    // Map result to match tool template exactly
    const bookingData = {
      booking_id: result.booking.id,
      start_at,
      end_at,
      scheduled_time: args.preferred_time,
      total_estimate_amount: session.selectedQuote.result.total_estimate_amount,
      total_estimate_time_in_minutes: session.selectedQuote.result.total_estimate_time_in_minutes,
      remaining_balance_amount: session.selectedQuote.result.total_estimate_amount, // Initially same as total (no payments yet)
      deposit_amount: session.selectedQuote.result.deposit_amount
    };

    const duration = Date.now() - startTime;

    // Success breadcrumb
    sentry.addBreadcrumb(`Booking created successfully`, 'tool-create-booking', {
      sessionId: session.id,
      businessId: session.businessId,
      bookingId: result.booking.id,
      duration: duration,
      totalAmount: session.selectedQuote.result.total_estimate_amount
    });

    // Send booking confirmation SMS (fire and forget - don't block the response)
    BookingNotifications.sendBookingConfirmation(
      session,
      result.booking
    ).catch(error => {
      console.error('Booking notification failed (non-blocking):', error);
      sentry.trackError(error as Error, {
        sessionId: session.id,
        businessId: session.businessId,
        operation: 'tool_create_booking',
        metadata: {
          errorName: (error as Error).name
        }
      });
    });

    // Success - clean response with specific message
    return buildToolResponse(
      bookingData,
      `Booking confirmed for ${args.preferred_date} at ${args.preferred_time}. You will receive a confirmation message shortly.`,
      true
    );

  } catch (error) {
    const duration = Date.now() - startTime;

    // Track booking creation error
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'tool_create_booking',
      metadata: {
        duration: duration,
        preferredDate: args.preferred_date,
        preferredTime: args.preferred_time,
        quoteId: session.selectedQuote?.result?.quote_id,
        hasSelectedQuote: !!session.selectedQuote,
        hasCustomerEntity: !!session.customerEntity,
        errorName: (error as Error).name
      }
    });

    // Internal system errors should still throw (database issues, etc.)
    throw error;
  }
}
