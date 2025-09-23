import { BaseRepository } from '../base-repository';
import type { Booking, CreateBookingData } from '../types/bookings';
import { BookingStatus } from '../types/bookings';
import assert from 'assert';
import { DateUtils } from '../../../utils/date-utils';
import type {
  QuoteRequestInfo,
  DetailedQuoteResult,
  BookingAddress,
  ServiceWithQuantity
} from '../../../../scheduling/lib/types/booking-calculations';
import type { Business } from '../types/business';
import { BookingCalculator } from '../../../../scheduling/lib/bookings/quoteCalculation/pricing-calculator';
import { AddressRepository } from './address-repository';
import { ServiceRepository } from './service-repository';
import { BookingServiceRepository } from './booking-service-repository';
import { AvailabilitySlotsRepository } from './availability-slots-repository';
import { AvailabilityManager } from '../../../../scheduling/lib/availability/availability-manager';

export class BookingsRepository extends BaseRepository<Booking> {
  private bookingCalculator: BookingCalculator;
  private addressesRepository: AddressRepository;
  private serviceRepository: ServiceRepository;
  private bookingServiceRepository: BookingServiceRepository;
  private availabilitySlotsRepository: AvailabilitySlotsRepository;

  constructor() {
    super('bookings');
    this.bookingCalculator = new BookingCalculator();
    this.addressesRepository = new AddressRepository();
    this.serviceRepository = new ServiceRepository();
    this.bookingServiceRepository = new BookingServiceRepository();
    this.availabilitySlotsRepository = new AvailabilitySlotsRepository();
  }

  /**
   * Create a complete booking with services, addresses, and pricing
   * Supports both calculated-on-demand and pre-calculated pricing
   */
  async createBookingWithServicesAndAddresses(
    quoteRequestData: QuoteRequestInfo,
    user_id: string,
    start_at: string, // UTC ISO string
    quoteResultData?: DetailedQuoteResult // Optional: use pre-calculated pricing to avoid recalculation
  ): Promise<Booking> {
    try {
      // Step 1: Create addresses in database first
      await this.createAddresses(quoteRequestData.addresses);

      // Step 2: Use pre-calculated result (required - no fallback calculation)
      assert(quoteResultData, 'Quote result data is required for booking creation');
      const calculationResult: DetailedQuoteResult = quoteResultData;

      // Step 3: Create booking with calculated data (only fields that exist in Booking interface)
      const bookingData: CreateBookingData = {
        user_id,
        business_id: quoteRequestData.business.id,
        status: BookingStatus.PENDING,
        start_at,
        end_at: DateUtils.addMinutesUTC(start_at, calculationResult.total_estimate_time_in_minutes),
        total_estimate_amount: calculationResult.total_estimate_amount,
        total_estimate_time_in_minutes: calculationResult.total_estimate_time_in_minutes,
        deposit_amount: calculationResult.deposit_amount,
        remaining_balance: calculationResult.total_estimate_amount, // Initially same as total
        deposit_paid: false, // Initially false until payment
        price_breakdown: calculationResult.price_breakdown
      };

      // Step 4: Create the booking in database
      const createdBooking = await this.create(bookingData);

      // Step 5: Create booking services (many-to-many relationship)
      await this.createBookingServices(createdBooking.id, quoteRequestData.services);

      // Step 6: Update availability slots after successful booking creation
      await this.updateAvailabilityAfterBooking(createdBooking, quoteRequestData.business);

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
      // Ensure service_id is always provided
      if (!bookingAddress.service_id) {
        throw new Error(`Address creation requires service_id: ${JSON.stringify(bookingAddress)}`);
      }

      await this.addressesRepository.create({
        service_id: bookingAddress.service_id,
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
        service_id: serviceItem.service.id
        // TODO: Add quantity field to database schema - currently missing from booking_services table
      });
    }
  }


  /**
   * Update availability slots after booking creation
   */
  private async updateAvailabilityAfterBooking(booking: Booking, business: Business): Promise<void> {
    try {
      // Get current availability slots for the business
      const currentAvailabilitySlots = await this.availabilitySlotsRepository.findOne({
        business_id: booking.business_id
      });

      if (currentAvailabilitySlots) {
        // Create availability manager instance
        const availabilityManager = new AvailabilityManager(currentAvailabilitySlots, business);

        // Update availability after booking
        const updatedAvailabilitySlots = availabilityManager.updateAvailabilityAfterBooking(booking);

        // Save updated availability slots back to database
        await this.availabilitySlotsRepository.updateOne(
          { id: currentAvailabilitySlots.id },
          { slots: updatedAvailabilitySlots.slots }
        );

        console.log(`[BookingsRepository] Updated availability slots for business ${booking.business_id} after booking ${booking.id}`);
      } else {
        console.warn(`[BookingsRepository] No availability slots found for business ${booking.business_id}`);
      }
    } catch (error) {
      console.error(`[BookingsRepository] Failed to update availability after booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Don't throw error to avoid breaking booking creation -çc availability update is non-critical
    }
  }
}
