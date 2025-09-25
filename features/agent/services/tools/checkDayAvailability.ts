import { AvailabilitySlotsRepository } from '../../../shared/lib/database/repositories/availability-slots-repository';
import { AvailabilityManager } from '../../../scheduling/lib/availability/availability-manager';
import type { Session } from '../../sessions/session';
import { buildToolResponse } from '../helpers/responseBuilder';
import { DateUtils } from '../../../shared/utils/date-utils';
import { sentry } from '@/features/shared/utils/sentryService';

/**
 * Check day availability - uses session injection for minimal dependencies
 */
export async function checkDayAvailability(
  args: {
    date: string;
    quote_total_estimate_time_minutes: number;
  },
  session: Session
) {
  const startTime = Date.now();

  try {
    // Add breadcrumb for availability check start
    sentry.addBreadcrumb(`Checking day availability`, 'tool-check-availability', {
      sessionId: session.id,
      businessId: session.businessId,
      date: args.date,
      estimatedTimeMinutes: args.quote_total_estimate_time_minutes,
      businessTimezone: session.businessEntity.time_zone
    });
    // Validate date format using DateUtils
    if (!DateUtils.isValidDateFormat(args.date)) {
      // User input error - invalid date format
      return buildToolResponse(null, `Invalid date format. Please use YYYY-MM-DD`, false);
    }

    const businessDate = args.date; // Business timezone date (e.g., "2025-09-27" in Melbourne)

    // Validate date is not in the past - compare business dates directly
    const { date: todayInBusinessTimezone } = DateUtils.convertUTCToTimezone(DateUtils.nowUTC(), session.businessEntity.time_zone);

    if (businessDate < todayInBusinessTimezone) {
      // User input error - past date
      return buildToolResponse(null, `Cannot check past dates. Please select a future date.`, false);
    }

    // Get current availability slots for the business
    const availabilitySlotsRepo = new AvailabilitySlotsRepository();
    const currentAvailabilitySlots = await availabilitySlotsRepo.findOne({
      business_id: session.businessEntity.id
    });

    if (!currentAvailabilitySlots) {
      // User input error - no availability configured
      return buildToolResponse(null, `No availability for this date, please try another date.`, false);
    }

    // Use AvailabilityManager to check the day with quote duration (pass business date)
    const availabilityManager = new AvailabilityManager(currentAvailabilitySlots, session.businessEntity);
    const availabilityResult = availabilityManager.checkDayAvailability(
      businessDate, // Pass business date - AvailabilityManager will handle UTC conversion
      args.quote_total_estimate_time_minutes
    );

    if (!availabilityResult.success) {
      // User input error - no availability on requested date
      return buildToolResponse(null, availabilityResult.formattedMessage, false);
    }

    // Convert response back to business date and times (AvailabilityManager already converts times to business timezone)
    const availabilityData = {
      date: businessDate, // Return original business date that user requested
      available_times: availabilityResult.availableSlots.map(slot => slot.time) // Already in business timezone
    };

    const duration = Date.now() - startTime;

    // Success breadcrumb
    sentry.addBreadcrumb(`Availability check completed successfully`, 'tool-check-availability', {
      sessionId: session.id,
      businessId: session.businessId,
      date: args.date,
      duration: duration,
      availableSlotsCount: availabilityResult.availableSlots.length,
      firstAvailableTime: availabilityResult.availableSlots[0]?.time
    });

    // Success - use response builder
    return buildToolResponse(
      availabilityData,
      `Available times for ${availabilityResult.date}: ${availabilityResult.availableSlots.map(slot => slot.time).join(', ')}`,
      true
    );

  } catch (error) {
    const duration = Date.now() - startTime;

    // Track availability check error
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'tool_check_day_availability',
      metadata: {
        duration: duration,
        date: args.date,
        estimatedTimeMinutes: args.quote_total_estimate_time_minutes,
        businessTimezone: session.businessEntity.time_zone,
        errorName: (error as Error).name
      }
    });

    // Internal system errors should still throw (database issues, etc.)
    throw error;
  }
}
