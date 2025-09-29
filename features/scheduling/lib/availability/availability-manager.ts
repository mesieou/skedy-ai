import { DURATION_INTERVALS } from "../types/availability-manager";
import { AvailabilitySlots, AvailabilitySlot } from "@/features/shared/lib/database/types/availability-slots";
import { Booking } from "@/features/shared/lib/database/types/bookings";
import { DateUtils } from "@/features/shared/utils/date-utils";
import { Business } from "@/features/shared/lib/database/types/business";
import { User } from "@/features/shared/lib/database/types/user";
import { CalendarSettings } from "@/features/shared/lib/database/types/calendar-settings";
import {
  generateAvailabilitySlotsForDate,
  findBusinessesNeedingRollover,
  rolloverBusinessesAvailability,
  findBestDurationMatch,
  getBusinessDayUTCRange,
  addDaysBusinessDate
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
    const updatedSlots = { ...this.availabilitySlots.slots };

    // Get all UTC dates that this booking spans (handles multi-day bookings)
    const affectedUtcDates = this.getBookingSpanUtcDates(booking.start_at, booking.end_at);

    console.log(`[AvailabilityManager] Booking ${booking.id} affects ${affectedUtcDates.length} UTC dates: ${affectedUtcDates.join(', ')}`);

    for (const utcDateKey of affectedUtcDates) {
      const dateSlots = updatedSlots[utcDateKey];
      if (!dateSlots) continue;

      for (const duration of DURATION_INTERVALS) {
        const durationKey = duration.key;
        const slots = dateSlots[durationKey];
        if (!slots) continue;

        // Process each slot using precomputed timestampMs
        dateSlots[durationKey] = slots
          .map(([time, providerCount, timestampMs]) => {
            // Check if this slot overlaps with the booking using millisecond timestamps
            const slotEndMs = timestampMs + duration.minutes * 60_000;
            const bookingStartMs = DateUtils.getTimestamp(booking.start_at);
            const bookingEndMs = DateUtils.getTimestamp(booking.end_at);

            // Fast millisecond-based overlap check
            if (timestampMs < bookingEndMs && slotEndMs > bookingStartMs) {
              const newCount = providerCount - 1;
              console.log(`[AvailabilityManager] Reducing providers for ${durationKey}min slot at ${time} from ${providerCount} to ${newCount}`);
              return newCount > 0 ? [time, newCount, timestampMs] as AvailabilitySlot : null;
            }
            return [time, providerCount, timestampMs] as AvailabilitySlot;
          })
          .filter((slot): slot is AvailabilitySlot => slot !== null);
      }

      updatedSlots[utcDateKey] = dateSlots;
    }

    return {
      ...this.availabilitySlots,
      slots: updatedSlots,
    };
  }

  /**
   * Get all UTC date keys that a booking spans (handles multi-day bookings)
   */
  private getBookingSpanUtcDates(startUTC: string, endUTC: string): string[] {
    const startDate = DateUtils.extractDateString(startUTC);
    const endDate = DateUtils.extractDateString(endUTC);

    const affectedDates: string[] = [startDate];

    // Add all dates between start and end (for multi-day bookings)
    let currentDate = startDate;
    while (currentDate !== endDate) {
      currentDate = DateUtils.extractDateString(
        DateUtils.addDaysUTC(currentDate + 'T00:00:00.000Z', 1)
      );
      affectedDates.push(currentDate);
    }

    return affectedDates;
  }

  async generateInitialBusinessAvailability(
    providers: User[],
    calendarSettings: CalendarSettings[],
    fromBusinessDate: string, // Business date (e.g., "2025-09-27")
    days: number = 30
  ): Promise<AvailabilitySlots> {
    const allSlots: { [utcDateKey: string]: { [durationKey: string]: AvailabilitySlot[] } } = {};
    // Added third element: timestampMs for faster filtering
    const processedBusinessDates = new Set<string>();

    console.log(`[AvailabilityManager] Generating ${days} days of availability from business date: ${fromBusinessDate}`);

    for (let offset = 0; offset < days; offset++) {
      const businessDate = addDaysBusinessDate(fromBusinessDate, offset, this.business.time_zone);

      // Skip if we've already processed this business date
      if (processedBusinessDates.has(businessDate)) {
        console.log(`[AvailabilityManager] Skipping already processed business date: ${businessDate}`);
        continue;
      }
      processedBusinessDates.add(businessDate);

      const { utcDateKeys, startMs, endMs } = getBusinessDayUTCRange(businessDate, this.business.time_zone);
      console.log(`[AvailabilityManager] Business date ${businessDate} spans UTC dates: ${utcDateKeys.join(', ')}`);

      // Generate slots for this business date
      const businessDaySlots = await generateAvailabilitySlotsForDate(
        providers,
        calendarSettings,
        DateUtils.createSlotTimestamp(businessDate, '12:00:00'), // noon UTC timestamp
        this.business.time_zone
      );

      // Distribute slots to correct UTC dates based on their actual timestamps
      for (const utcKey of utcDateKeys) {
        allSlots[utcKey] = {};

        for (const durationKey in businessDaySlots) {
          allSlots[utcKey][durationKey] = businessDaySlots[durationKey]
            .map(([time, count]) => {
              // Create timestamp for this time on this specific UTC date
              const candidateTimestamp = DateUtils.createSlotTimestamp(utcKey, time + ':00');
              const timestampMs = DateUtils.getTimestamp(candidateTimestamp);

              // Only include this slot if the timestamp falls within the business day range
              if (timestampMs >= startMs && timestampMs <= endMs) {
                return [time, count, timestampMs] as AvailabilitySlot;
              }
              return null;
            })
            .filter((slot): slot is AvailabilitySlot => slot !== null);
        }
      }
    }

    console.log(`[AvailabilityManager] Generated slots for ${processedBusinessDates.size} unique business dates across ${days} days`);

    return {
      ...this.availabilitySlots,
      slots: allSlots
    };
  }

  /**
   * Check availability for a specific date with optional service duration
   * Returns formatted availability data suitable for AI receptionist responses
   */
  checkDayAvailability(dateStr: string, serviceDurationMinutes?: number): {
    success: boolean;
    date: string;
    availableSlots: Array<{ time: string; providerCount: number }>;
    formattedMessage: string;
    error?: string;
  } {
    if (!DateUtils.isValidDateFormat(dateStr)) {
      return { success: false, date: dateStr, availableSlots: [], formattedMessage: "", error: "Invalid date format" };
    }

    if (!serviceDurationMinutes) {
      return { success: false, date: dateStr, availableSlots: [], formattedMessage: "Service duration required", error: "Missing service duration" };
    }

    const durationKey = findBestDurationMatch(serviceDurationMinutes);
    const { startMs, endMs, utcDateKeys } = getBusinessDayUTCRange(dateStr, this.business.time_zone);

    const allSlots: Array<{ time: string; providerCount: number; timestampMs: number }> = [];

    for (const utcKey of utcDateKeys) {
      const daySlots = this.availabilitySlots.slots[utcKey]?.[durationKey] || [];
      for (const [time, providerCount, timestampMs] of daySlots) {
        if (timestampMs >= startMs && timestampMs <= endMs) {
          const { time: businessTime } = DateUtils.convertUTCToTimezone(DateUtils.createSlotTimestamp(utcKey, time + ':00'), this.business.time_zone);
          allSlots.push({ time: businessTime, providerCount, timestampMs });
        }
      }
    }

    if (!allSlots.length) {
      return {
        success: true,
        date: dateStr,
        availableSlots: [],
        formattedMessage: `Unfortunately, we're fully booked on ${this.formatDateForDisplay(dateStr)}.`
      };
    }

    // Sort by timestampMs
    allSlots.sort((a, b) => a.timestampMs - b.timestampMs);

    const formattedMessage = this.formatAvailabilityMessage(dateStr, allSlots);

    return {
      success: true,
      date: dateStr,
      availableSlots: allSlots.map(({ time, providerCount }) => ({ time, providerCount })),
      formattedMessage
    };
  }

  /**
   * Format availability message in natural receptionist language
   */
  private formatAvailabilityMessage(dateStr: string, slots: Array<{ time: string; providerCount: number }>): string {
    const displayDate = this.formatDateForDisplay(dateStr);

    if (slots.length === 0) {
      return `Unfortunately, we're fully booked on ${displayDate}.`;
    }

    if (slots.length === 1) {
      const slot = slots[0];
      return `On ${displayDate}, I have ${slot.time} available.`;
    }

    if (slots.length === 2) {
      const [first, second] = slots;
      return `On ${displayDate}, I have ${first.time} and ${second.time} available.`;
    }

    // More than 2 slots - show time range
    const firstTime = slots[0].time;
    const lastTime = slots[slots.length - 1].time;
    const firstFormatted = this.formatTimeForDisplay(firstTime);
    const lastFormatted = this.formatTimeForDisplay(lastTime);

    return `On ${displayDate}, I have availability from ${firstFormatted} to ${lastFormatted}.`;
  }

  /**
   * Format date for natural display (e.g., "Monday, 15th January")
   */
  private formatDateForDisplay(dateStr: string): string {
    // dateStr is already a business date (YYYY-MM-DD), format it directly
    const date = new Date(dateStr + 'T12:00:00'); // Use noon to avoid timezone edge cases
    const formatted = date.toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: this.business.time_zone
    });

    // Add ordinal suffix to day
    const day = date.getDate();
    const suffix = this.getOrdinalSuffix(day);

    return formatted.replace(`${day}`, `${day}${suffix}`);
  }

  // ============================================================================
  // TIMEZONE & FORMATTING HELPERS
  // ============================================================================



  /**
   * Format time for natural display (e.g., "10:30 AM", "1:00 PM", "1:30 PM")
   * Optimized to avoid repeated Date object creation
   */
  private formatTimeForDisplay(timeStr: string): string {
    // timeStr is already in business timezone (e.g., "17:00"), format directly
    const [hours, minutes] = timeStr.split(':').map(Number);

    // Create a single date object for formatting
    const tempDate = new Date(2000, 0, 1, hours, minutes); // Use fixed date, only time matters

    return tempDate.toLocaleTimeString('en-AU', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Get ordinal suffix for day (1st, 2nd, 3rd, 4th, etc.)
   */
  private getOrdinalSuffix(day: number): string {
    if (day >= 11 && day <= 13) {
      return 'th';
    }
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
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

}
