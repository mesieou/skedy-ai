import { DURATION_INTERVALS } from "./../types/scheduling";
import { AvailabilitySlots } from "@/features/shared/lib/database/types/availability-slots";
import { Booking } from "@/features/shared/lib/database/types/bookings";
import { DateUtils } from "@/features/shared/utils/date-utils";

// Class AvailabilityManager
export class AvailabilityManager {


  constructor(
    private availabilitySlots: AvailabilitySlots,
    private readonly booking: Booking
  ) {
    this.availabilitySlots = availabilitySlots;
    this.booking = booking;
  }

  updateAvailabilityAfterBooking(): AvailabilitySlots {
    // Extract date and timestamps using utility functions
    const dateStr = DateUtils.extractDateString(this.booking.start_at);
    const bookingStartMs = DateUtils.getTimestamp(this.booking.start_at);
    const bookingEndMs = DateUtils.getTimestamp(this.booking.end_at);

    const updatedSlots = { ...this.availabilitySlots.slots };

    for (const duration of DURATION_INTERVALS) {
      const durationKey = duration.key;
      const slots = (updatedSlots[durationKey] as [string, number][]) || [];
      updatedSlots[durationKey] = this.processSlots(slots, dateStr, duration, bookingStartMs, bookingEndMs);
    }

    return {
      ...this.availabilitySlots,
      slots: updatedSlots
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
      const slotEndMs = DateUtils.calculateEndTimestamp(slotStartMs, duration.minutes);

      if (DateUtils.doPeriodsOverlap(slotStartMs, slotEndMs, bookingStartMs, bookingEndMs)) {
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
