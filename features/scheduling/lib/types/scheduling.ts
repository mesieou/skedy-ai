
import { DateTime } from "luxon";
import { Booking } from "@/features/shared/lib/database/types/bookings";

// Default duration configuration for scheduling
export const DURATION_INTERVALS = [
    { key: "30", minutes: 30 },
    { key: "45", minutes: 45 },
    { key: "60", minutes: 60 },
    { key: "90", minutes: 90 },
    { key: "120", minutes: 120 },
    { key: "150", minutes: 150 },
    { key: "180", minutes: 180 },
    { key: "240", minutes: 240 },
    { key: "300", minutes: 300 },
    { key: "360", minutes: 360 }
];

// Type definitions for scheduling
export interface Provider {
  id: string;
  timezone: string;
  workingHours: {
    [key: string]: { start: string; end: string } | undefined;
  };
}

export interface TimeSlot {
  start: DateTime;
  end: DateTime;
  count: number;
}

// Extended Booking interface to include provider information
export interface BookingWithProvider extends Booking {
  provider_id?: string;
}