import { BaseEntity } from "./base";

// Booking enums
export enum BookingStatus {
  NOT_ACCEPTED = 'not_accepted',
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
  total_estimate_time: number;
}

export type CreateBookingData = Omit<Booking, 'id' | 'created_at' | 'updated_at'>;
export type UpdateBookingData = Partial<Omit<Booking, 'id' | 'created_at'>>;
