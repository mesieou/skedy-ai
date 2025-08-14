import { BaseEntity } from "./base";

export interface BookingService extends BaseEntity {
  booking_id: string;
  service_id: string;
  quantity: number; // How many of this service (e.g., 3 people, 2 vehicles)
}

export type CreateBookingServiceData = Omit<BookingService, 'id' | 'created_at' | 'updated_at'>;
export type UpdateBookingServiceData = Partial<Omit<BookingService, 'id' | 'created_at'>>;
