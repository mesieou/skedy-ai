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
  rolloverBusinessesAvailability,
  findBestDurationMatch
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
      //
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
        currentDate,
        this.business.time_zone
      );
    }

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
    try {
      console.log(`[AvailabilityManager.checkDayAvailability] Checking availability for date: ${dateStr}`);

      // Validate date format using DateUtils
      if (!DateUtils.isValidDateFormat(dateStr)) {
        return {
          success: false,
          date: dateStr,
          availableSlots: [],
          formattedMessage: "",
          error: "Invalid date format. Please use YYYY-MM-DD format."
        };
      }

      // Convert business date to UTC date for database lookup
      const businessDate = dateStr; // Business timezone date (e.g., "2025-09-27" in Melbourne)
      const utcTimestamp = DateUtils.convertBusinessTimeToUTC(businessDate, '12:00:00', this.business.time_zone);
      const utcDate = DateUtils.extractDateString(utcTimestamp); // UTC date for database lookup

      console.log(`[AvailabilityManager] Business date: ${businessDate} → UTC date: ${utcDate}`);

      // Get slots for the UTC date key
      const daySlots = this.availabilitySlots.slots[utcDate];

      if (!daySlots) {
        return {
          success: false,
          date: dateStr,
          availableSlots: [],
          formattedMessage: `Sorry, we don't have availability data for ${this.formatDateForDisplay(dateStr)}.`,
          error: "No availability data for this date"
        };
      }

      // Get slots for the appropriate duration (use service duration or default to 60-min)
      const durationKey = findBestDurationMatch(serviceDurationMinutes || 60);
      const durationSlots = daySlots[durationKey] || [];

      console.log(`[AvailabilityManager] Checking ${durationKey}-minute slots for ${serviceDurationMinutes || 60}-minute service`);

      if (durationSlots.length === 0) {
        return {
          success: true,
          date: dateStr,
          availableSlots: [],
          formattedMessage: `Unfortunately, we're fully booked on ${this.formatDateForDisplay(dateStr)}.`
        };
      }

      // Convert UTC slot times to business timezone for user display
      const availableSlots = durationSlots.map(([utcTime, providerCount]) => {
        // utcTime is stored as "14:00" but represents UTC time, convert to business timezone
        const utcTimestamp = DateUtils.createSlotTimestamp(utcDate, utcTime + ':00');
        const { time: businessTime } = DateUtils.convertUTCToTimezone(utcTimestamp, this.business.time_zone);
        return {
          time: businessTime, // Returns HH:MM in business timezone
          providerCount
        };
      });

      // Create natural receptionist message
      const formattedMessage = this.formatAvailabilityMessage(dateStr, availableSlots);

      return {
        success: true,
        date: businessDate, // Return original business date
        availableSlots,
        formattedMessage
      };

    } catch (error) {
      console.error(`[AvailabilityManager.checkDayAvailability] Error checking availability:`, error);
      return {
        success: false,
        date: dateStr,
        availableSlots: [],
        formattedMessage: "Sorry, I couldn't check availability right now. Please try again.",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
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
    const { date: localDate } = this.convertToBusinessTimezone(dateStr, '00:00:00');

    // Create date object for formatting
    const date = new Date(localDate + 'T00:00:00');
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
   * Convert UTC slot time to business timezone
   */
  private convertSlotToBusinessTime(dateStr: string, time: string): string {
    const { time: businessTime } = this.convertToBusinessTimezone(dateStr, time);
    return businessTime.substring(0, 5); // "17:00" format
  }

  /**
   * Convert UTC timestamp to business timezone (centralized helper)
   */
  private convertToBusinessTimezone(dateStr: string, time: string): { date: string; time: string } {
    const utcTimestamp = DateUtils.createSlotTimestamp(dateStr, time);
    return DateUtils.convertUTCToTimezone(utcTimestamp, this.business.time_zone);
  }


  /**
   * Format time for natural display (e.g., "10:30 AM", "1:00 PM", "1:30 PM")
   */
  private formatTimeForDisplay(timeStr: string): string {
    // timeStr is already in Melbourne timezone (17:00), so just format it for display
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    return date.toLocaleTimeString('en-AU', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: this.business.time_zone
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


  // ============================================================================
  // SLOT PROCESSING HELPERS
  // ============================================================================

  private processSlots(
    slots: [string, number][],
    dateStr: string,
    duration: { key: string; minutes: number },
    booking: Booking
  ): [string, number][] {
    return slots
      .map(([slotTime, providerCount]) =>
        this.processIndividualSlot(slotTime, providerCount, dateStr, duration, booking)
      )
      .filter((slot): slot is [string, number] => slot !== null);
  }

  private processIndividualSlot(
    slotTime: string,
    providerCount: number,
    dateStr: string,
    duration: { key: string; minutes: number },
    booking: Booking
  ): [string, number] | null {
    const slotStartMs = DateUtils.createSlotTimestamp(dateStr, slotTime);
    const slotEndMs = DateUtils.calculateEndTimestamp(slotStartMs, duration.minutes);

    const hasOverlap = DateUtils.doPeriodsOverlap(
      slotStartMs,
      slotEndMs,
      booking.start_at,
      booking.end_at
    );

    if (hasOverlap) {
      const newProviderCount = providerCount - 1;
      console.log(
        `[AvailabilityManager] Reducing providers for ${duration.key}min slot at ${slotTime} from ${providerCount} to ${newProviderCount}`
      );
      return newProviderCount > 0 ? [slotTime, newProviderCount] : null;
    }

    return [slotTime, providerCount];
  }
}
