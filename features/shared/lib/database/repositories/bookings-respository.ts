import { BaseRepository } from '../base-repository';
import type { Booking, CreateBookingData } from '../types/bookings';
import { BookingStatus } from '../types/bookings';
import { DateUtils } from '../../../utils/date-utils';
import type { 
  BookingCalculationInput, 
  BookingCalculationResult,
  BookingAddress,
  ServiceWithQuantity 
} from '../../../../scheduling/lib/types/booking-calculations';
import { BookingCalculator } from '../../../../scheduling/lib/bookings/booking-calculator';
import { AddressRepository } from './address-repository';
import { ServiceRepository } from './service-repository';
import { BookingServiceRepository } from './booking-service-repository';

export class BookingsRepository extends BaseRepository<Booking> {
  private bookingCalculator: BookingCalculator;
  private addressesRepository: AddressRepository;
  private serviceRepository: ServiceRepository;
  private bookingServiceRepository: BookingServiceRepository;

  constructor() {
    super('bookings'); // Table name (plural)
    this.bookingCalculator = new BookingCalculator();
    this.addressesRepository = new AddressRepository();
    this.serviceRepository = new ServiceRepository();
    this.bookingServiceRepository = new BookingServiceRepository();
  }

  /**
   * Create a complete booking with services, addresses, and pricing
   */
  async createBookingWithServicesAndAddresses(
    input: BookingCalculationInput,
    user_id: string,
    start_at: string // UTC ISO string
  ): Promise<Booking> {
    try {
      // Step 1: Create addresses in database first
      await this.createAddresses(input.addresses);
      
      // Step 2: Calculate booking pricing and time using SAME input
      const calculationResult: BookingCalculationResult = await this.bookingCalculator.calculateBooking(input);
      
      // Step 3: Create booking with calculated data
      const bookingData: CreateBookingData = {
        user_id,
        business_id: input.business.id,
        status: BookingStatus.PENDING,
        start_at,
        end_at: DateUtils.addMinutesUTC(start_at, calculationResult.total_estimate_time_in_minutes),
        ...calculationResult // Spread the calculation result directly
      };
      
      // Step 4: Create the booking in database
      const createdBooking = await this.create(bookingData);
      
      // Step 5: Create booking services (many-to-many relationship)
      await this.createBookingServices(createdBooking.id, input.services);
      
      return createdBooking;
      
    } catch (error) {
      throw new Error(`Failed to create booking with calculation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create addresses in database
   */
  private async createAddresses(addresses: BookingAddress[]): Promise<void> {
    for (const bookingAddress of addresses) {
      await this.addressesRepository.create({
        service_id: bookingAddress.service_id || '',
        type: bookingAddress.address.type,
        address_line_1: bookingAddress.address.address_line_1,
        address_line_2: bookingAddress.address.address_line_2,
        city: bookingAddress.address.city,
        postcode: bookingAddress.address.postcode,
        state: bookingAddress.address.state,
        country: bookingAddress.address.country
      });
    }
  }

  /**
   * Create booking services relationship (multiple services per booking)
   */
  private async createBookingServices(bookingId: string, services: ServiceWithQuantity[]): Promise<void> {
    for (const serviceItem of services) {
      await this.bookingServiceRepository.create({
        booking_id: bookingId,
        service_id: serviceItem.service.id,
        quantity: serviceItem.quantity
      });
    }
  }
}
