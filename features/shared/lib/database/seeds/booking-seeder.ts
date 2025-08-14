import { BaseSeeder } from './base-seeder';
import { BookingsRepository } from '../repositories/bookings-respository';
import type { Booking } from '../types/bookings';
import type { BookingCalculationInput } from '../../../../scheduling/lib/types/booking-calculations';

export class BookingSeeder extends BaseSeeder<Booking> {
  constructor() {
    super(new BookingsRepository());
  }

  // Create booking with services and addresses using dynamic arguments
  async createBookingWithServicesAndAddresses(
    input: BookingCalculationInput,
    user_id: string,
    start_at: string
  ): Promise<Booking> {
    const repository = this.repository as BookingsRepository;
    return await repository.createBookingWithServicesAndAddresses(input, user_id, start_at);
  }
}
