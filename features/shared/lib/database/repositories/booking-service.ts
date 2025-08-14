import { BaseRepository } from '../base-repository';
import type { BookingService } from '../types/booking-services';

export class BookingServiceRepository extends BaseRepository<BookingService> {
  constructor() {
    super('booking_services'); // Table name (plural)
  }
}
