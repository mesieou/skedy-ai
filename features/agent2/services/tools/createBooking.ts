import { BookingOrchestrator } from '../../../scheduling/lib/bookings/booking-orchestrator';
import type { Session } from '../../sessions/session';
import type { Tool } from '../../../shared/lib/database/types/tools';
import { buildToolResponse } from '../helpers/response-builder';
import { DateUtils } from '../../../shared/utils/date-utils';

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
  session: Session,
  tool: Tool
) {
  try {
    // Validate date format using DateUtils
    if (!DateUtils.isValidDateFormat(args.preferred_date)) {
      // User input error - invalid date format
      return buildToolResponse(tool, null, `Invalid date format. Please use YYYY-MM-DD format.`);
    }

    // Validate time format using DateUtils
    if (!DateUtils.isValidTimeFormat(args.preferred_time)) {
      // User input error - invalid time format
      return buildToolResponse(tool, null, `Invalid time format. Please use HH:MM format (24-hour).`);
    }

    // Validate date is not in the past - compare business dates directly
    const { date: todayInBusinessTimezone } = DateUtils.convertUTCToTimezone(DateUtils.nowUTC(), session.businessEntity.time_zone);

    if (args.preferred_date < todayInBusinessTimezone) {
      // User input error - past date
      return buildToolResponse(tool, null, `Cannot book past dates. Please select a future date.`);
    }

    // Get selected quote and request from session
    if (!session.selectedQuote || !session.selectedQuoteRequest) {
      // User input error - no quote selected
      return buildToolResponse(tool, null, `No quote selected. Please get a quote first.`);
    }

    // Validate quote_id matches the selected quote
    if (session.selectedQuote.quote_id !== args.quote_id) {
      // User input error - quote mismatch
      return buildToolResponse(tool, null, `Quote ID mismatch. Please get a fresh quote.`);
    }

    // Validate user exists in session
    if (!session.customerEntity) {
      // User input error - no user in session
      return buildToolResponse(tool, null, `User profile required. Please create a user profile first.`);
    }

    // Add missing fields to quoteResultData before passing to BookingOrchestrator
    const completeQuoteResultData = {
      ...session.selectedQuote,
      remaining_balance: session.selectedQuote.total_estimate_amount, // Initially same as total
      deposit_paid: false // Initially false until payment tools handle it
    };

    // Use BookingOrchestrator for core booking creation
    const bookingOrchestrator = new BookingOrchestrator();
    const result = await bookingOrchestrator.createBooking({
      quoteRequestData: session.selectedQuoteRequest,
      quoteResultData: completeQuoteResultData,
      userId: session.customerEntity.id,
      preferredDate: args.preferred_date,
      preferredTime: args.preferred_time
    });

    if (!result.success || !result.booking) {
      // User input error - booking failed (availability, etc.)
      return buildToolResponse(tool, null, result.error || `Booking could not be created. We will contact you shortly.`);
    }

    // Convert booking UTC timestamps to business timezone for user display
    const { date: start_date, time: start_time } = DateUtils.convertUTCToTimezone(result.booking.start_at, session.businessEntity.time_zone);
    const { date: end_date, time: end_time } = DateUtils.convertUTCToTimezone(result.booking.end_at, session.businessEntity.time_zone);

    const start_at = `${start_date} ${start_time}`;
    const end_at = `${end_date} ${end_time}`;

    // Update session - conversation completed
    session.conversationState = 'completed';

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

    // Success - use response builder
    return buildToolResponse(tool, bookingData as unknown as Record<string, unknown>);

  } catch (error) {
    // Internal system errors should still throw (database issues, etc.)
    throw error;
  }
}
