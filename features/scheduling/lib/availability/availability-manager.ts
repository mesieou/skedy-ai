import { DURATION_INTERVALS } from "../types/availability-manager";
import { AvailabilitySlots } from "@/features/shared/lib/database/types/availability-slots";
import { Booking } from "@/features/shared/lib/database/types/bookings";
import { DateUtils } from "@/features/shared/utils/date-utils";
import { Business } from "@/features/shared/lib/database/types/business";
import { User } from "@/features/shared/lib/database/types/user";
import { CalendarSettings } from "@/features/shared/lib/database/types/calendar-settings";
import { 
  generateAvailabilitySlotsForDate,
  findBusinessesNeedingRollover,
  rolloverBusinessesAvailability
} from "../../utils/availability-helpers";

// Class AvailabilityManager
export class AvailabilityManager {
  constructor(
    private availabilitySlots: AvailabilitySlots,
    private readonly business: Business
  ) {
    this.availabilitySlots = availabilitySlots;
  }

  updateAvailabilityAfterBooking(booking: Booking): AvailabilitySlots {
    // Extract date and timestamps using utility functions
    const dateStr = DateUtils.extractDateString(booking.start_at);

    const updatedSlots = { ...this.availabilitySlots.slots };

    // Get slots for the booking date
    if (updatedSlots[dateStr]) {
      const dateSlots = { ...updatedSlots[dateStr] };
      
      for (const duration of DURATION_INTERVALS) {
        const durationKey = duration.key;
        const slots = dateSlots[durationKey] || [];
        dateSlots[durationKey] = this.processSlots(
          slots,
          dateStr,
          duration,
          booking
        );
      }
      
      updatedSlots[dateStr] = dateSlots;
    }

    return {
      ...this.availabilitySlots,
      slots: updatedSlots,
    };
  }

  async generateInitialBusinessAvailability(
    providers: User[],
    calendarSettings: CalendarSettings[],
    fromDate: string, // UTC ISO string
    days: number = 30
  ): Promise<AvailabilitySlots> {
    const allSlots: { [dateKey: string]: { [durationKey: string]: [string, number][] } } = {};

    // Generate availability for the specified number of days
    for (let dayOffset = 0; dayOffset < days; dayOffset++) {
      const currentDate = DateUtils.addDaysUTC(fromDate, dayOffset);
      const dateKey = DateUtils.extractDateString(currentDate); // "2025-01-15"
      
      // Generate availability for all duration intervals for this day
      allSlots[dateKey] = await generateAvailabilitySlotsForDate(
        providers,
        calendarSettings,
        currentDate
      );
    }

    return {
      ...this.availabilitySlots,
      slots: allSlots
    };
  }

  /**
   * Orchestrate availability rollover for all businesses that need it
   * This method should be triggered by a cron job every hour to check for businesses
   * where it's midnight in their timezone
   */
  static async orchestrateAvailabilityRollover(currentUtcTime?: string): Promise<void> {
    console.log(`[AvailabilityManager.orchestrateAvailabilityRollover] Starting availability rollover process`);
    
    try {
      // 1. Find all businesses that need rollover (midnight in their timezone)
      const businessesNeedingRollover = await findBusinessesNeedingRollover(currentUtcTime);
      
      if (businessesNeedingRollover.length === 0) {
        console.log(`[AvailabilityManager.orchestrateAvailabilityRollover] No businesses need rollover at this time`);
        return;
      }
      
      // 2. Rollover availability for all businesses that need it
      await rolloverBusinessesAvailability(businessesNeedingRollover);
      
      console.log(`[AvailabilityManager.orchestrateAvailabilityRollover] Successfully completed rollover for ${businessesNeedingRollover.length} businesses`);
      
    } catch (error) {
      console.error(`[AvailabilityManager.orchestrateAvailabilityRollover] Error during availability rollover:`, error);
      throw error;
    }
  }


  private processSlots(
    slots: [string, number][],
    dateStr: string,
    duration: { key: string; minutes: number },
    booking: Booking
  ): [string, number][] {
    const newSlots: [string, number][] = [];

    for (const [slotTime, providerCount] of slots) {
      const slotStartMs = DateUtils.createSlotTimestamp(dateStr, slotTime);
      const slotEndMs = DateUtils.calculateEndTimestamp(
        slotStartMs,
        duration.minutes
      );

      if (
        DateUtils.doPeriodsOverlap(
          slotStartMs,
          slotEndMs,
          booking.start_at,
          booking.end_at
        )
      ) {
        const newProviderCount = providerCount - 1;
        console.log(
          `[AvailabilityManager- updateAvailabilityAfterBooking] Reducing providers for ${duration.key}min slot at ${slotTime} from ${providerCount} to ${newProviderCount}`
        );
        if (newProviderCount > 0) {
          newSlots.push([slotTime, newProviderCount]);
        }
      } else {
        newSlots.push([slotTime, providerCount]);
      }
    }

    return newSlots;
  }
}