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
    quote_id: string;
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
      quoteId: args.quote_id,
      hasSelectedQuote: !!session.selectedQuote
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
    if (!session.selectedQuote || !session.selectedQuoteRequest) {
      // User input error - no quote selected
      return buildToolResponse(null, `No quote selected. Please get a quote first.`, false);
    }

    // Validate quote_id matches the selected quote
    if (session.selectedQuote.quote_id !== args.quote_id) {
      // User input error - quote mismatch
      return buildToolResponse(null, `Quote ID mismatch. Please get a fresh quote.`, false);
    }

    // Validate user exists in session
    if (!session.customerEntity) {
      // User input error - no user in session
      return buildToolResponse(null, `User profile required. Please create a user profile first.`, false);
    }

    // Use BookingOrchestrator for core booking creation
    const bookingOrchestrator = new BookingOrchestrator();
    const result = await bookingOrchestrator.createBooking({
      quoteRequestData: session.selectedQuoteRequest,
      quoteResultData: session.selectedQuote,
      userId: session.customerEntity.id,
      preferredDate: args.preferred_date,
      preferredTime: args.preferred_time
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
      total_estimate_amount: session.selectedQuote.total_estimate_amount,
      total_estimate_time_in_minutes: session.selectedQuote.total_estimate_time_in_minutes,
      remaining_balance_amount: session.selectedQuote.total_estimate_amount, // Initially same as total (no payments yet)
      deposit_amount: session.selectedQuote.deposit_amount
    };

    const duration = Date.now() - startTime;

    // Success breadcrumb
    sentry.addBreadcrumb(`Booking created successfully`, 'tool-create-booking', {
      sessionId: session.id,
      businessId: session.businessId,
      bookingId: result.booking.id,
      duration: duration,
      totalAmount: session.selectedQuote.total_estimate_amount
    });

    // Send booking confirmation SMS (fire and forget - don't block the response)
    // Get service name from the selected quote request
    const serviceName = session.selectedQuoteRequest?.services?.[0]?.service?.name;

    BookingNotifications.sendBookingConfirmation(
      result.booking,
      session.customerEntity,
      session.businessEntity,
      serviceName
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
        quoteId: args.quote_id,
        hasSelectedQuote: !!session.selectedQuote,
        hasCustomerEntity: !!session.customerEntity,
        errorName: (error as Error).name
      }
    });

    // Internal system errors should still throw (database issues, etc.)
    throw error;
  }
}
