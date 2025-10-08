import { TimeSlot, BookingWithProvider, DURATION_INTERVALS } from "../lib/types/availability-manager";
import { User } from "@/features/shared/lib/database/types/user";
import { CalendarSettings } from "@/features/shared/lib/database/types/calendar-settings";
import { Business } from "@/features/shared/lib/database/types/business";
import { AvailabilitySlot } from "@/features/shared/lib/database/types/availability-slots";

import { DateUtils } from "@/features/shared/utils/date-utils";
import { BusinessRepository } from "@/features/shared/lib/database/repositories/business-repository";
import { UserRepository } from "@/features/shared/lib/database/repositories/user-repository";
import { CalendarSettingsRepository } from "@/features/shared/lib/database/repositories/calendar-settings-repository";
import { AvailabilitySlotsRepository } from "@/features/shared/lib/database/repositories/availability-slots-repository";

export async function computeBusinessAvailibityForOneDay(
  providers: User[],
  calendarSettings: CalendarSettings[],
  date: string, // UTC ISO string
  slotDurationMinutes: number,
  businessTimezone: string
): Promise<TimeSlot[]> {
  // 1. Get working hours for all providers on the day
  const workingHours = getWorkingHoursForDay(providers, calendarSettings, date, businessTimezone);

  // 2. Generate slots for each provider separately
  const slotsByProvider = workingHours.map((providerSchedule) =>
    generateSlotsForProvider(providerSchedule, slotDurationMinutes)
  );

  // 3. Fetch bookings for providers on that day
  const bookings = await getBookingsForProviders(
    providers.map(p => p.id),
    date
  );

  // 4. Remove slots overlapping bookings for each provider
  const freeSlotsByProvider = slotsByProvider.map((providerSlots) =>
    removeBookedSlots(providerSlots, bookings)
  );

  // 5. Aggregate all providers' free slots into combined availability counts
  const aggregatedSlots = aggregateSlotsAcrossProviders(freeSlotsByProvider);

  return aggregatedSlots;
}

export function getWorkingHoursForDay(
  providers: User[],
  calendarSettings: CalendarSettings[],
  date: string, // UTC ISO string
  businessTimezone: string
) {
  // Convert UTC date to business timezone to get the correct local day
  const { date: businessDate } = DateUtils.convertUTCToTimezone(date, businessTimezone);
  const jsDate = new Date(businessDate + 'T00:00:00'); // Parse as local date
  const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dayKey = dayNames[jsDate.getDay()]; // Use local day

  console.log(`[getWorkingHoursForDay] Processing UTC ${DateUtils.extractDateString(date)} → Business ${businessDate} (${dayKey}) for ${providers.length} providers in timezone ${businessTimezone}`);

  return providers
    .map((provider) => {
      // Find calendar settings for this provider
      const providerCalendarSettings = calendarSettings.find(cs => cs.user_id === provider.id);
      if (!providerCalendarSettings) {
        console.log(`[getWorkingHoursForDay] No calendar settings found for provider ${provider.id}`);
        return null;
      }

      const hours = providerCalendarSettings.working_hours[dayKey];
      if (!hours) {
        console.log(`[getWorkingHoursForDay] No working hours for ${dayKey} for provider ${provider.id}`);
        return null;
      }

      console.log(`[getWorkingHoursForDay] Provider ${provider.id} working hours on ${dayKey}: ${hours.start} - ${hours.end} (local time)`);

      // Convert local working hours to UTC
      const start = DateUtils.convertBusinessTimeToUTC(businessDate, hours.start + ':00', businessTimezone);

      // Handle cross-day working hours (e.g., 07:00 to 17:00 same day, or 22:00 to 06:00 next day)
      let end: string;
      if (hours.end < hours.start) {
        // End time is next day in local time
        const nextBusinessDay = DateUtils.addDaysUTC(businessDate + 'T00:00:00.000Z', 1);
        const nextBusinessDate = DateUtils.extractDateString(nextBusinessDay);
        end = DateUtils.convertBusinessTimeToUTC(nextBusinessDate, hours.end + ':00', businessTimezone);
      } else {
        // Same day
        end = DateUtils.convertBusinessTimeToUTC(businessDate, hours.end + ':00', businessTimezone);
      }

      console.log(`[getWorkingHoursForDay] Converted to UTC working hours: ${start} - ${end}`);

      return { providerId: provider.id, start, end };
    })
    .filter(Boolean) as Array<{ providerId: string; start: string; end: string }>;
}

export function generateSlotsForProvider(
  schedule: { providerId: string; start: string; end: string },
  slotDurationMinutes: number
) {
  console.log(`[generateSlotsForProvider] Generating ${slotDurationMinutes}min slots for provider ${schedule.providerId} from ${schedule.start} to ${schedule.end}`);

  const slots: Array<{ providerId: string; start: string; end: string }> = [];
  let slotStart = schedule.start;

  while (DateUtils.isBeforeUTC(DateUtils.addMinutesUTC(slotStart, slotDurationMinutes), schedule.end) ||
         DateUtils.addMinutesUTC(slotStart, slotDurationMinutes) === schedule.end) {
    slots.push({
      providerId: schedule.providerId,
      start: slotStart,
      end: DateUtils.addMinutesUTC(slotStart, slotDurationMinutes),
    });
    slotStart = DateUtils.addMinutesUTC(slotStart, 60); // slide 1 hour
  }

  console.log(`[generateSlotsForProvider] Generated ${slots.length} slots for provider ${schedule.providerId}`);
  return slots;
}

export async function getBookingsForProviders(
  providerIds: string[],
  date: string // UTC ISO string
): Promise<BookingWithProvider[]> {
  // Implement your DB call here to fetch bookings for these providers on this date
  // For example:
  // SELECT * FROM bookings WHERE provider_id IN (...) AND booking_date = date

  // Stub implementation - remove unused parameter warnings
  console.log(`Fetching bookings for providers: ${providerIds.join(', ')} on ${DateUtils.extractDateString(date)}`);
  return []; // stub
}

export function removeBookedSlots(
  slots: Array<{ providerId: string; start: string; end: string }>,
  bookings: BookingWithProvider[]
) {
  return slots.filter((slot) => {
    // Check if this slot overlaps any booking for same provider
    const hasOverlap = bookings.some((booking) => {
      if (booking.provider_id !== slot.providerId) return false;
      // Use DateUtils to check overlap between slot and booking
      return DateUtils.doPeriodsOverlap(
        slot.start,
        slot.end,
        booking.start_at, // already UTC ISO string
        booking.end_at    // already UTC ISO string
      );
    });
    return !hasOverlap;
  });
}

export function aggregateSlotsAcrossProviders(
  freeSlotsByProvider: Array<
    Array<{ providerId: string; start: string; end: string }>
  >
): TimeSlot[] {
  // Flatten all free slots from all providers
  const allFreeSlots = freeSlotsByProvider.flat();
  console.log(`[aggregateSlotsAcrossProviders] Processing ${allFreeSlots.length} total free slots from ${freeSlotsByProvider.length} providers`);

  // Use a map keyed by ISO start time string to count availability
  const slotMap = new Map<string, { start: string; end: string; count: number }>();

  for (const slot of allFreeSlots) {
    const key = slot.start; // unique key for slot start time (already UTC ISO string)
    if (!slotMap.has(key)) {
      slotMap.set(key, { start: slot.start, end: slot.end, count: 1 });
    } else {
      slotMap.get(key)!.count += 1;
    }
  }

  const result = Array.from(slotMap.values()).sort((a, b) =>
    DateUtils.getTimestamp(a.start) - DateUtils.getTimestamp(b.start)
  );

  console.log(`[aggregateSlotsAcrossProviders] Generated ${result.length} aggregated time slots`);
  return result;
}

/**
 * Generate availability slots for all duration intervals for a single date
 * Returns slots with precomputed timestamps for performance
 */
export async function generateAvailabilitySlotsForDate(
  providers: User[],
  calendarSettings: CalendarSettings[],
  date: string, // UTC ISO string
  businessTimezone: string
): Promise<{ [durationKey: string]: [string, number][] }> {
  const slots: { [durationKey: string]: [string, number][] } = {};

  for (const duration of DURATION_INTERVALS) {
    const timeSlots = await computeBusinessAvailibityForOneDay(
      providers,
      calendarSettings,
      date,
      duration.minutes,
      businessTimezone
    );

    // Convert TimeSlot[] to [string, number][] format (without timestamps here)
    // Timestamps will be added in the AvailabilityManager when assigning to UTC date keys
    slots[duration.key] = timeSlots.map(slot => [
      DateUtils.extractTimeString(slot.start).substring(0, 5), // "07:00", "08:00", etc.
      slot.count
    ]);
  }

  return slots;
}


// =====================================
// AVAILABILITY ROLLOVER FUNCTIONS
// =====================================

/**
 * Find all businesses that need availability rollover (midnight in their timezone)
 */
export async function findBusinessesNeedingRollover(currentUtcTime?: string): Promise<Business[]> {
  console.log(`[findBusinessesNeedingRollover] FUNCTION CALLED - Starting business search`);
  const businessRepository = new BusinessRepository();
  const utcTime = currentUtcTime || DateUtils.nowUTC();
  console.log(`[findBusinessesNeedingRollover] Using UTC time: ${utcTime}`);

  // Get all businesses first to debug
  const allBusinesses = await businessRepository.findAll();
  console.log(`[findBusinessesNeedingRollover] Checking ${allBusinesses.length} total businesses at UTC time: ${utcTime}`);

  // Debug each business timezone
  allBusinesses.forEach(business => {
    const localTime = DateUtils.convertUTCToTimezone(utcTime, business.time_zone);
    const isMidnight = DateUtils.isMidnightInTimezone(utcTime, business.time_zone);
    console.log(`[findBusinessesNeedingRollover] Business ${business.name} (${business.time_zone}): Local time ${localTime.date} ${localTime.time}, isMidnight: ${isMidnight}, hour: ${localTime.time.split(':')[0]}`);
  });

  const businessesNeedingRollover = await businessRepository.findBusinessesAtMidnight(currentUtcTime);

  console.log(`[findBusinessesNeedingRollover] Found ${businessesNeedingRollover.length} businesses needing rollover at ${utcTime}`);
  if (businessesNeedingRollover.length > 0) {
    businessesNeedingRollover.forEach(business => {
      console.log(`[findBusinessesNeedingRollover] - ${business.name} (${business.time_zone})`);
    });
  }

  return businessesNeedingRollover;
}

/**
 * Rollover availability for multiple businesses
 */
export async function rolloverBusinessesAvailability(businesses: Business[]): Promise<void> {
  console.log(`[rolloverBusinessesAvailability] Starting rollover for ${businesses.length} businesses`);

  const rolloverPromises = businesses.map(business =>
    rolloverSingleBusinessAvailability(business)
  );

  await Promise.all(rolloverPromises);
  console.log(`[rolloverBusinessesAvailability] Completed rollover for ${businesses.length} businesses`);
}

/**
 * Rollover availability for a single business
 * - Ensure at least 30 days of future availability
 * - Remove all dates before today (cleanup old dates)
 */
export async function rolloverSingleBusinessAvailability(business: Business): Promise<void> {
  console.log(`[rolloverSingleBusinessAvailability] Starting rollover for business: ${business.name} (${business.id})`);

  try {
    // 1. Get all providers (users with PROVIDER or ADMIN_PROVIDER role) for this business
    const userRepository = new UserRepository();
    const providers = await userRepository.findProvidersByBusinessId(business.id);

    if (providers.length === 0) {
      console.log(`[rolloverSingleBusinessAvailability] No providers found for business ${business.id}`);
      return;
    }

    // 2. Get calendar settings for these providers
    const calendarSettingsRepository = new CalendarSettingsRepository();
    const calendarSettings = await calendarSettingsRepository.findByUserIds(
      providers.map(provider => provider.id)
    );

    if (calendarSettings.length === 0) {
      console.log(`[rolloverSingleBusinessAvailability] No calendar settings found for business ${business.id}`);
      return;
    }

    // 3. Get current availability slots for this business
    const availabilitySlotsRepository = new AvailabilitySlotsRepository();
    const currentAvailabilitySlots = await availabilitySlotsRepository.findOne({ business_id: business.id });

    if (!currentAvailabilitySlots) {
      console.log(`[rolloverSingleBusinessAvailability] No availability slots found for business ${business.id}`);
      return;
    }

    // 4. Get current date and calculate what dates we need (FIXED: use business timezone)
    const currentUtcTime = DateUtils.nowUTC();
    const businessToday = DateUtils.convertUTCToTimezone(currentUtcTime, business.time_zone);
    const todayDateStr = businessToday.date;  // Use business timezone date, not UTC date

    const existingDates = Object.keys(currentAvailabilitySlots.slots);
    const futureDates = existingDates.filter(date => date >= todayDateStr).sort();

    console.log(`[rolloverSingleBusinessAvailability] Current future dates: ${futureDates.length} (${futureDates.join(', ')})`);

    // 5. Generate dates to ensure we have at least 30 days from today
    const targetDate = DateUtils.addDaysUTC(`${todayDateStr}T00:00:00.000Z`, 29); // 30 days total (today + 29)
    const targetDateStr = DateUtils.extractDateString(targetDate);

    const updatedSlots = { ...currentAvailabilitySlots.slots };
    let datesAdded = 0;
    let datesRemoved = 0;

    // 6. Remove all dates before today
    const datesToRemove: string[] = [];
    existingDates.forEach(date => {
      if (date < todayDateStr) {
        delete updatedSlots[date];
        datesToRemove.push(date);
        datesRemoved++;
      }
    });

    if (datesToRemove.length > 0) {
      console.log(`[rolloverSingleBusinessAvailability] Removing ${datesToRemove.length} old dates: ${datesToRemove.join(', ')}`);
    }

    // 7. Add missing future dates to reach at least 30 days
    const startDate = futureDates.length > 0
      ? DateUtils.addDaysUTC(`${futureDates[futureDates.length - 1]}T00:00:00.000Z`, 1)
      : `${todayDateStr}T00:00:00.000Z`;

    const datesToAdd: string[] = [];
    let currentDate = startDate;
    while (DateUtils.extractDateString(currentDate) <= targetDateStr) {
      const dateKey = DateUtils.extractDateString(currentDate);

      if (!updatedSlots[dateKey]) {
        // Generate availability for this day
        const daySlots = await generateAvailabilitySlotsForDate(
          providers,
          calendarSettings,
          currentDate,
          business.time_zone
        );

        // Convert to enhanced format with precomputed timestamps
        const enhancedSlots: { [durationKey: string]: AvailabilitySlot[] } = {};
        for (const durationKey in daySlots) {
          enhancedSlots[durationKey] = daySlots[durationKey].map(([time, count]) => {
            const timestampMs = DateUtils.getTimestamp(DateUtils.createSlotTimestamp(dateKey, time + ':00'));
            return [time, count, timestampMs] as AvailabilitySlot;
          });
        }

        updatedSlots[dateKey] = enhancedSlots;
        datesToAdd.push(dateKey);
        datesAdded++;
      }

      currentDate = DateUtils.addDaysUTC(currentDate, 1);
    }

    if (datesToAdd.length > 0) {
      console.log(`[rolloverSingleBusinessAvailability] Adding ${datesToAdd.length} new dates: ${datesToAdd.join(', ')}`);
    }

    // 8. Update the availability slots in the database
    await availabilitySlotsRepository.updateOne(
      { id: currentAvailabilitySlots.id },
      { slots: updatedSlots }
    );

    const finalDates = Object.keys(updatedSlots).filter(date => date >= todayDateStr).sort();
    console.log(`[rolloverSingleBusinessAvailability] Successfully rolled over availability for business ${business.id}. Added: ${datesAdded} dates, Removed: ${datesRemoved} old dates. Total future dates: ${finalDates.length}`);

  } catch (error) {
    console.error(`[rolloverSingleBusinessAvailability] Error rolling over availability for business ${business.id}:`, error);
    throw error;
  }
}

// =====================================
// DURATION MATCHING UTILITIES
// =====================================

/**
 * Find the best duration interval match for a given service duration
 * Reuses DURATION_INTERVALS to avoid code duplication across the system
 */
export function findBestDurationMatch(serviceDurationMinutes: number): string {
  // Find the smallest duration interval that can accommodate the service
  for (const interval of DURATION_INTERVALS) {
    if (interval.minutes >= serviceDurationMinutes) {
      return interval.key;
    }
  }
  // If service duration exceeds all intervals, use the largest one
  return DURATION_INTERVALS[DURATION_INTERVALS.length - 1].key;
}
