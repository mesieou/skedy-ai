import { BaseEntity } from "./base";

export interface Booking extends BaseEntity {
  user_id: string;
  business_id: string;
  status: string;
  total_estimate_amount: number;
  total_estimate_time: number;
}

export type CreateBookingData = Omit<Booking, 'id' | 'created_at' | 'updated_at'>;
export type UpdateBookingData = Partial<Omit<Booking, 'id' | 'created_at'>>;
