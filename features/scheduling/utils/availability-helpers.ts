import { TimeSlot, BookingWithProvider, DURATION_INTERVALS } from "../lib/types/availability-manager";
import { User } from "@/features/shared/lib/database/types/user";
import { CalendarSettings } from "@/features/shared/lib/database/types/calendar-settings";
import { Business } from "@/features/shared/lib/database/types/business";

import { DateUtils } from "@/features/shared/utils/date-utils";
import { BusinessRepository } from "@/features/shared/lib/database/repositories/business-repository";
import { UserRepository } from "@/features/shared/lib/database/repositories/user-repository";
import { CalendarSettingsRepository } from "@/features/shared/lib/database/repositories/calendar-settings-repository";
import { AvailabilitySlotsRepository } from "@/features/shared/lib/database/repositories/availability-slots-repository";

export async function computeBusinessAvailibityForOneDay(
  providers: User[],
  calendarSettings: CalendarSettings[],
  date: string, // UTC ISO string
  slotDurationMinutes: number
): Promise<TimeSlot[]> {
  // 1. Get working hours for all providers on the day
  const workingHours = getWorkingHoursForDay(providers, calendarSettings, date);

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
  date: string // UTC ISO string
) {
  const dateStr = DateUtils.extractDateString(date);
  const jsDate = new Date(dateStr);
  const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dayKey = dayNames[jsDate.getDay()]; // e.g., "mon"
  
  return providers
    .map((provider) => {
      // Find calendar settings for this provider
      const providerCalendarSettings = calendarSettings.find(cs => cs.user_id === provider.id);
      if (!providerCalendarSettings) return null;
      
      const hours = providerCalendarSettings.working_hours[dayKey];
      if (!hours) return null;

      // Build UTC ISO strings for start/end
      const [startHour, startMinute] = hours.start.split(":").map(Number);
      const [endHour, endMinute] = hours.end.split(":").map(Number);
      
      const start = DateUtils.createUTC(
        jsDate.getFullYear(),
        jsDate.getMonth() + 1,
        jsDate.getDate(),
        startHour,
        startMinute
      );

      const end = DateUtils.createUTC(
        jsDate.getFullYear(),
        jsDate.getMonth() + 1,
        jsDate.getDate(),
        endHour,
        endMinute
      );

      return { providerId: provider.id, start, end };
    })
    .filter(Boolean) as Array<{ providerId: string; start: string; end: string }>;
}

export function generateSlotsForProvider(
  schedule: { providerId: string; start: string; end: string },
  slotDurationMinutes: number
) {
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

  // Convert map to sorted array by start time
  return Array.from(slotMap.values()).sort((a, b) =>
    DateUtils.getTimestamp(a.start) - DateUtils.getTimestamp(b.start)
  );
}

/**
 * Generate availability slots for all duration intervals for a single date
 */
export async function generateAvailabilitySlotsForDate(
  providers: User[],
  calendarSettings: CalendarSettings[],
  date: string // UTC ISO string
): Promise<{ [durationKey: string]: [string, number][] }> {
  const slots: { [durationKey: string]: [string, number][] } = {};
  
  for (const duration of DURATION_INTERVALS) {
    const timeSlots = await computeBusinessAvailibityForOneDay(
      providers,
      calendarSettings,
      date,
      duration.minutes
    );
    
    // Convert TimeSlot[] to [string, number][] format
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
  const businessRepository = new BusinessRepository();
  const businessesNeedingRollover = await businessRepository.findBusinessesAtMidnight(currentUtcTime);
  
  console.log(`[findBusinessesNeedingRollover] Found ${businessesNeedingRollover.length} businesses needing rollover at ${currentUtcTime || DateUtils.nowUTC()}`);
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
    
    // 4. Get current date and calculate what dates we need
    const currentUtcTime = DateUtils.nowUTC();
    const todayDateStr = DateUtils.extractDateString(currentUtcTime);
    
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
    existingDates.forEach(date => {
      if (date < todayDateStr) {
        delete updatedSlots[date];
        datesRemoved++;
      }
    });
    
    // 7. Add missing future dates to reach at least 30 days
    const startDate = futureDates.length > 0 
      ? DateUtils.addDaysUTC(`${futureDates[futureDates.length - 1]}T00:00:00.000Z`, 1)
      : `${todayDateStr}T00:00:00.000Z`;
    
    let currentDate = startDate;
    while (DateUtils.extractDateString(currentDate) <= targetDateStr) {
      const dateKey = DateUtils.extractDateString(currentDate);
      
      if (!updatedSlots[dateKey]) {
        // Generate availability for this day
        const daySlots = await generateAvailabilitySlotsForDate(
          providers,
          calendarSettings,
          currentDate
        );
        
        updatedSlots[dateKey] = daySlots;
        datesAdded++;
      }
      
      currentDate = DateUtils.addDaysUTC(currentDate, 1);
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
