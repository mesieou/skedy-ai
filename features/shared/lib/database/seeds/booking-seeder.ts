import { BaseSeeder } from './base-seeder';
import { BookingsRepository } from '../repositories/bookings-respository';
import type { Booking } from '../types/bookings';
import type { QuoteRequestInfo } from '../../../../scheduling/lib/types/booking-calculations';
import { BookingStatus } from '../types/bookings';
import { DateUtils } from '../../../utils/date-utils';

export class BookingSeeder extends BaseSeeder<Booking> {
  constructor() {
    super(new BookingsRepository());
  }

  /**
   * Create booking manually from quote request info (for seeding/testing)
   * Note: This creates bookings without full quote calculations
   * For production bookings with quotes, use BookingsRepository.createBookingFromQuote()
   */
  async createBookingWithServicesAndAddresses(
    input: QuoteRequestInfo,
    user_id: string,
    start_at: string
  ): Promise<Booking> {
    const repository = this.repository as BookingsRepository;

    // Calculate end time (estimate - simple for seeds)
    const estimatedMinutes = 60; // Default 1 hour
    const end_at = DateUtils.addMinutesUTC(start_at, estimatedMinutes);

    // Simple pricing estimate (for seeds only - production uses full quote calculation)
    const totalAmount = 100 * (input.services[0]?.quantity || 1); // Simple estimate

    // Convert BookingAddress[] to CreateAddressData[] if addresses exist
    const addressData = input.addresses?.map(addr => ({
      service_id: addr.service_id || input.services[0]?.service.id || '',
      type: addr.type,
      address_line_1: addr.address.address_line_1,
      address_line_2: addr.address.address_line_2,
      city: addr.address.city,
      postcode: addr.address.postcode,
      state: addr.address.state,
      country: addr.address.country
    }));

    // Create booking manually (no quote calculation needed for seeds)
    return await repository.createBookingManual({
      user_id,
      business_id: input.business.id,
      start_at,
      end_at,
      status: BookingStatus.CONFIRMED,
      total_estimate_amount: totalAmount,
      total_estimate_time_in_minutes: estimatedMinutes,
      deposit_amount: totalAmount * 0.2, // 20% deposit
      deposit_paid: false,
      services: input.services.map(s => ({
        service_id: s.service.id,
        service_name: s.service.name
      })),
      addresses: addressData,
      business: input.business
    });
  }
}
