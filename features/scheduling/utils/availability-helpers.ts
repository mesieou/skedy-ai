import { TimeSlot, BookingWithProvider } from "../lib/types/availability-manager";
import { User } from "@/features/shared/lib/database/types/user";
import { CalendarSettings } from "@/features/shared/lib/database/types/calendar-settings";
import { DateUtils } from "@/features/shared/utils/date-utils";

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
