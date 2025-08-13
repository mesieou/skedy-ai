import { DateTime, Interval } from "luxon";
import { Provider, TimeSlot, BookingWithProvider } from "../lib/types/scheduling";


export async function computeBusinessAvailibityForOneDay(
  providers: Provider[],
  date: DateTime,
  slotDurationMinutes: number
): Promise<TimeSlot[]> {
  // 1. Get working hours for all providers on the day
  const workingHours = getWorkingHoursForDay(providers, date);

  // 2. Generate slots for each provider separately (e.g., 60-min slots starting every hour)
  const slotsByProvider = workingHours.map((provider) =>
    generateSlotsForProvider(provider, slotDurationMinutes)
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

export function getWorkingHoursForDay(providers: Provider[], date: DateTime) {
  const dayKey = date.toFormat("ccc").toLowerCase(); // e.g., "mon"
  return providers
    .map((p) => {
      const hours = p.workingHours[dayKey];
      if (!hours) return null;

      // Build DateTimes in provider's timezone for start/end
      const start = date
        .setZone(p.timezone)
        .set({
          hour: Number(hours.start.split(":")[0]),
          minute: Number(hours.start.split(":")[1]),
          second: 0,
          millisecond: 0,
        });

      const end = date
        .setZone(p.timezone)
        .set({
          hour: Number(hours.end.split(":")[0]),
          minute: Number(hours.end.split(":")[1]),
          second: 0,
          millisecond: 0,
        });

      return { providerId: p.id, start, end };
    })
    .filter(Boolean) as Array<{ providerId: string; start: DateTime; end: DateTime }>;
}

export function generateSlotsForProvider(
  schedule: { providerId: string; start: DateTime; end: DateTime },
  slotDurationMinutes: number
) {
  const slots: Array<{ providerId: string; start: DateTime; end: DateTime }> = [];
  let slotStart = schedule.start;

  while (slotStart.plus({ minutes: slotDurationMinutes }) <= schedule.end) {
    slots.push({
      providerId: schedule.providerId,
      start: slotStart,
      end: slotStart.plus({ minutes: slotDurationMinutes }),
    });
    slotStart = slotStart.plus({ minutes: 60 }); // slide 1 hour
  }
  return slots;
}

export async function getBookingsForProviders(
  providerIds: string[],
  date: DateTime
): Promise<BookingWithProvider[]> {
  // Implement your DB call here to fetch bookings for these providers on this date
  // For example:
  // SELECT * FROM bookings WHERE provider_id IN (...) AND booking_date = date
  
  // Stub implementation - remove unused parameter warnings
  console.log(`Fetching bookings for providers: ${providerIds.join(', ')} on ${date.toISODate()}`);
  return []; // stub
}

export function removeBookedSlots(
  slots: Array<{ providerId: string; start: DateTime; end: DateTime }>,
  bookings: BookingWithProvider[]
) {
  return slots.filter((slot) => {
    // Check if this slot overlaps any booking for same provider
    const hasOverlap = bookings.some((booking) => {
      if (booking.provider_id !== slot.providerId) return false;
      const slotInterval = Interval.fromDateTimes(slot.start, slot.end);
      const bookingInterval = Interval.fromDateTimes(
        DateTime.fromJSDate(booking.start_at),
        DateTime.fromJSDate(booking.end_at)
      );
      return slotInterval.overlaps(bookingInterval);
    });
    return !hasOverlap;
  });
}

export function aggregateSlotsAcrossProviders(
  freeSlotsByProvider: Array<
    Array<{ providerId: string; start: DateTime; end: DateTime }>
  >
): TimeSlot[] {
  // Flatten all free slots from all providers
  const allFreeSlots = freeSlotsByProvider.flat();

  // Use a map keyed by ISO start time string to count availability
  const slotMap = new Map<string, { start: DateTime; end: DateTime; count: number }>();

  for (const slot of allFreeSlots) {
    const key = slot.start.toISO()!; // unique key for slot start time
    if (!slotMap.has(key)) {
      slotMap.set(key, { start: slot.start, end: slot.end, count: 1 });
    } else {
      slotMap.get(key)!.count += 1;
    }
  }

  // Convert map to sorted array by start time
  return Array.from(slotMap.values()).sort((a, b) =>
    a.start.toMillis() - b.start.toMillis()
  );
}
