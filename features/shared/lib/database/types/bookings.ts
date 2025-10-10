import { BaseEntity } from "./base";
import { Address } from "./addresses";
import { BookingService } from "./booking-services";
import { Service } from "./service";
import type { PriceBreakdown } from '../../../../scheduling/lib/types/booking-calculations';

// Booking enums
export enum BookingStatus {
  NOT_ACCEPTED = 'not_accepted',
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export interface Booking extends BaseEntity {
  user_id: string;
  business_id: string;
  status: BookingStatus;
  total_estimate_amount: number;
  total_estimate_time_in_minutes: number;
  start_at: string; // UTC ISO string
  end_at: string;   // UTC ISO string
  deposit_amount: number;
  remaining_balance: number;
  deposit_paid: boolean;
  price_breakdown?: PriceBreakdown;
}

export interface CreateBookingWithServicesAndAddressesData {
  total_estimate_amount: number;
  total_estimate_time_in_minutes: number;
  booking: Booking;
  bookingServices: BookingService[];  // Multiple booking services for the booking
  services: {
    service: Service;         // Each entry is for one service
    addresses: Address[];     // Each service can have multiple addresses
  }[];
}

export type CreateBookingData = Omit<Booking, 'id' | 'created_at' | 'updated_at'>;
export type UpdateBookingData = Partial<Omit<Booking, 'id' | 'created_at'>>;
