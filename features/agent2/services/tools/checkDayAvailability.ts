import { AvailabilitySlotsRepository } from '../../../shared/lib/database/repositories/availability-slots-repository';
import { AvailabilityManager } from '../../../scheduling/lib/availability/availability-manager';
import type { Session } from '../../sessions/session';
import type { Tool } from '../../../shared/lib/database/types/tools';
import { buildToolResponse } from '../helpers/response-builder';
import { DateUtils } from '../../../shared/utils/date-utils';

/**
 * Check day availability - uses session injection for minimal dependencies
 */
export async function checkDayAvailability(
  args: {
    date: string;
    quote_total_estimate_time_minutes: number;
  },
  session: Session,
  tool: Tool
) {
  try {
    // Validate date format using DateUtils
    if (!DateUtils.isValidDateFormat(args.date)) {
      // User input error - invalid date format
      return buildToolResponse(tool, null, `Invalid date format. Please use YYYY-MM-DD`);
    }

    // Validate date is not in the past - compare business dates directly
    const { date: todayInBusinessTimezone } = DateUtils.convertUTCToTimezone(DateUtils.nowUTC(), session.businessEntity.time_zone);

    if (args.date < todayInBusinessTimezone) {
      // User input error - past date
      return buildToolResponse(tool, null, `Cannot check past dates. Please select a future date.`);
    }

    // Get current availability slots for the business
    const availabilitySlotsRepo = new AvailabilitySlotsRepository();
    const currentAvailabilitySlots = await availabilitySlotsRepo.findOne({
      business_id: session.businessEntity.id
    });

    if (!currentAvailabilitySlots) {
      // User input error - no availability configured
      return buildToolResponse(tool, null, `No availability for this date, please try another date.`);
    }

    // Use AvailabilityManager to check the day with quote duration
    const availabilityManager = new AvailabilityManager(currentAvailabilitySlots, session.businessEntity);
    const availabilityResult = availabilityManager.checkDayAvailability(
      args.date,
      args.quote_total_estimate_time_minutes
    );

    if (!availabilityResult.success) {
      // User input error - no availability on requested date
      return buildToolResponse(tool, null, availabilityResult.formattedMessage);
    }

    // AvailabilityManager already returns times in business timezone
    const availabilityData = {
      date: availabilityResult.date,
      available_times: availabilityResult.availableSlots.map(slot => slot.time)
    };

    // Success - use response builder
    return buildToolResponse(tool, availabilityData as unknown as Record<string, unknown>);

  } catch (error) {
    // Internal system errors should still throw (database issues, etc.)
    throw error;
  }
}
