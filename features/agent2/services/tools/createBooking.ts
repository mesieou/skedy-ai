import { BookingOrchestrator } from '../../../scheduling/lib/bookings/booking-orchestrator';
import type { Business } from '../../../shared/lib/database/types/business';
import type { User } from '../../../shared/lib/database/types/user';
import type { Tool } from '../../../shared/lib/database/types/tools';
import type { QuoteRequestInfo, QuoteResultInfo } from '../../../scheduling/lib/types/booking-calculations';
import { buildToolResponse } from './helpers/response-builder';
import { DateUtils } from '../../../shared/utils/date-utils';

/**
 * Create booking - uses response builder for consistency
 */
export async function createBooking(
  args: {
    preferred_date: string;
    preferred_time: string;
    quote_id: string;
    confirmation_message?: string;
  },
  business: Business,
  user: User,
  tool: Tool,
  quoteRequestData: QuoteRequestInfo,
  quoteResultData: QuoteResultInfo
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
    const { date: todayInBusinessTimezone } = DateUtils.convertUTCToTimezone(DateUtils.nowUTC(), business.time_zone);

    if (args.preferred_date < todayInBusinessTimezone) {
      // User input error - past date
      return buildToolResponse(tool, null, `Cannot book past dates. Please select a future date.`);
    }

    // Validate quote_id matches the quote data
    if (quoteResultData.quote_id !== args.quote_id) {
      // User input error - quote mismatch
      return buildToolResponse(tool, null, `Quote ID mismatch. Please get a fresh quote.`);
    }

    // Add missing fields to quoteResultData before passing to BookingOrchestrator
    const completeQuoteResultData = {
      ...quoteResultData,
      remaining_balance: quoteResultData.total_estimate_amount, // Initially same as total
      deposit_paid: false // Initially false until payment tools handle it
    };

    // Use BookingOrchestrator for core booking creation
    const bookingOrchestrator = new BookingOrchestrator();
    const result = await bookingOrchestrator.createBooking({
      quoteRequestData,
      quoteResultData: completeQuoteResultData,
      userId: user.id,
      preferredDate: args.preferred_date,
      preferredTime: args.preferred_time
    });

    if (!result.success || !result.booking) {
      // User input error - booking failed (availability, etc.)
      return buildToolResponse(tool, null, result.error || `Booking could not be created. We will contact you shortly.`);
    }

    // Calculate start_at and end_at timestamps
    const start_at = DateUtils.convertBusinessTimeToUTC(
      args.preferred_date,
      args.preferred_time + ':00',
      business.time_zone
    );
    const end_at = DateUtils.calculateEndTimestamp(
      start_at,
      quoteResultData.total_estimate_time_in_minutes
    );

    // Map result to match tool template exactly
    const bookingData = {
      booking_id: result.booking.id,
      start_at,
      end_at,
      scheduled_time: args.preferred_time,
      total_estimate_amount: quoteResultData.total_estimate_amount,
      total_estimate_time_in_minutes: quoteResultData.total_estimate_time_in_minutes,
      remaining_balance_amount: quoteResultData.total_estimate_amount, // Initially same as total (no payments yet)
      deposit_amount: quoteResultData.deposit_amount
    };

    // Success - use response builder
    return buildToolResponse(tool, bookingData as unknown as Record<string, unknown>);

  } catch (error) {
    // Internal system errors should still throw (database issues, etc.)
    throw error;
  }
}
