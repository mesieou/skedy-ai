import { DURATION_INTERVALS, Provider } from "../types/scheduling";
import { AvailabilitySlots } from "@/features/shared/lib/database/types/availability-slots";
import { Booking } from "@/features/shared/lib/database/types/bookings";
import { DateUtils } from "@/features/shared/utils/date-utils";
import { Business } from "@/features/shared/lib/database/types/business";
import { DateTime } from "luxon";
import { computeBusinessAvailibityForOneDay } from "../../utils/availability-helpers";

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
    const bookingStartMs = DateUtils.getTimestamp(booking.start_at);
    const bookingEndMs = DateUtils.getTimestamp(booking.end_at);

    const updatedSlots = { ...this.availabilitySlots.slots };

    for (const duration of DURATION_INTERVALS) {
      const durationKey = duration.key;
      const slots = (updatedSlots[durationKey] as [string, number][]) || [];
      updatedSlots[durationKey] = this.processSlots(
        slots,
        dateStr,
        duration,
        bookingStartMs,
        bookingEndMs
      );
    }

    return {
      ...this.availabilitySlots,
      slots: updatedSlots,
    };
  }

  async generateInitialBusinessAvailability(
    providers: Provider[],
    fromDate: DateTime,
    days: number = 30
  ): Promise<AvailabilitySlots> {
    const allSlots: { [dateKey: string]: { [durationKey: string]: [string, number][] } } = {};

    // Generate availability for the specified number of days
    for (let dayOffset = 0; dayOffset < days; dayOffset++) {
      const currentDate = fromDate.plus({ days: dayOffset });
      const dateKey = currentDate.toISODate()!; // "2025-01-15"
      
      // Initialize this date's slots
      allSlots[dateKey] = {};
      
      // Generate availability for all duration intervals for this day
      for (const duration of DURATION_INTERVALS) {
        const timeSlots = await computeBusinessAvailibityForOneDay(
          providers,
          currentDate,
          duration.minutes
        );
        
        // Convert TimeSlot[] to [string, number][] format (just time, not full datetime)
        allSlots[dateKey][duration.key] = timeSlots.map(slot => [
          slot.start.toFormat('HH:mm'), // "07:00", "08:00", etc.
          slot.count
        ]);
      }
    }

    return {
      ...this.availabilitySlots,
      slots: allSlots
    };
  }



  private processSlots(
    slots: [string, number][],
    dateStr: string,
    duration: { key: string; minutes: number },
    bookingStartMs: number,
    bookingEndMs: number
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
          bookingStartMs,
          bookingEndMs
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