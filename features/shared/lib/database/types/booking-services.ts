import { BaseEntity } from "./base";

export interface BookingService extends BaseEntity {
  booking_id: string;
  service_id: string;
}

export type CreateBookingServiceData = Omit<BookingService, 'id' | 'created_at' | 'updated_at'>;
export type UpdateBookingServiceData = Partial<Omit<BookingService, 'id' | 'created_at'>>;
