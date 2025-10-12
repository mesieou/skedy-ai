import { BaseRepository } from '../base-repository';
import type { Booking, CreateBookingData, ManualBookingParams, BookingCoreParams } from '../types/bookings';
import { BookingStatus } from '../types/bookings';
import assert from 'assert';
import { DateUtils } from '../../../utils/date-utils';
import type {
  QuoteRequestInfo,
  DetailedQuoteResult
} from '../../../../scheduling/lib/types/booking-calculations';
import type { BookingAddress, CreateAddressData } from '../types/addresses';
import type { Business } from '../types/business';
import { BookingCalculator } from '../../../../scheduling/lib/bookings/quoteCalculation/pricing-calculator';
import type { DepositPaymentState } from '../../../../agent/sessions/session';
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
   * Create booking from quote (AI Agent use case)
   * - Pre-calculated pricing from quote result
   * - All addresses collected during quote process
   * - Includes travel costs and detailed breakdown
   */
  async createBookingFromQuote(
    quoteRequestData: QuoteRequestInfo,
    user_id: string,
    start_at: string,
    quoteResultData: DetailedQuoteResult,
    depositPaymentState?: DepositPaymentState
  ): Promise<Booking> {
    try {
      assert(quoteResultData, 'Quote result data is required for quote-based booking creation');

      // Prepare booking data from quote result
      const bookingData: CreateBookingData = {
        user_id,
        business_id: quoteRequestData.business.id,
        status: BookingStatus.CONFIRMED, // Bookings created through AI agent are confirmed
        start_at,
        end_at: DateUtils.addMinutesUTC(start_at, quoteResultData.total_estimate_time_in_minutes),
        total_estimate_amount: quoteResultData.total_estimate_amount,
        total_estimate_time_in_minutes: quoteResultData.total_estimate_time_in_minutes,
        deposit_amount: quoteResultData.deposit_amount,
        remaining_balance: depositPaymentState?.status === 'completed'
          ? quoteResultData.total_estimate_amount - quoteResultData.deposit_amount
          : quoteResultData.total_estimate_amount,
        deposit_paid: depositPaymentState?.status === 'completed' || false,
        price_breakdown: quoteResultData.price_breakdown
      };

      // Map services for core method
      const services = quoteRequestData.services.map(s => ({
        service_id: s.service.id,
        quantity: s.quantity
      }));

      // Use core method for actual creation
      return await this._createBookingCore({
        user_id,
        business_id: quoteRequestData.business.id,
        start_at,
        end_at: bookingData.end_at,
        bookingData,
        services,
        addresses: quoteRequestData.addresses,
        business: quoteRequestData.business
      });

    } catch (error) {
      throw new Error(`Failed to create booking from quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create booking manually (Dashboard use case)
   * - Manual pricing entry (no quote calculation)
   * - Optional addresses based on service location_type
   * - No price breakdown (null)
   * - Remaining balance calculated server-side
   */
  async createBookingManual(params: ManualBookingParams): Promise<Booking> {
    try {
      const {
        user_id,
        business_id,
        start_at,
        end_at,
        status,
        total_estimate_amount,
        total_estimate_time_in_minutes,
        deposit_amount,
        deposit_paid,
        services,
        addresses,
        business
      } = params;

      // Calculate remaining balance based on deposit status
      const remaining_balance = deposit_paid
        ? total_estimate_amount - deposit_amount
        : total_estimate_amount;

      // Prepare booking data without price breakdown (manual entry - no calculations)
      const bookingData: CreateBookingData = {
        user_id,
        business_id,
        status,
        start_at,
        end_at,
        total_estimate_amount,
        total_estimate_time_in_minutes,
        deposit_amount,
        remaining_balance,
        deposit_paid,
        price_breakdown: null // No breakdown for manual bookings
      };

      // Map services for core method
      const servicesMapped = services.map(s => ({
        service_id: s.service_id
      }));

      // Use core method for actual creation
      return await this._createBookingCore({
        user_id,
        business_id,
        start_at,
        end_at,
        bookingData,
        services: servicesMapped,
        addresses,
        business
      });

    } catch (error) {
      throw new Error(`Failed to create manual booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Core booking creation logic (private - shared implementation)
   * Single responsibility: Create booking with all related entities
   * - Creates addresses (if provided)
   * - Creates booking record
   * - Creates booking-service relationships
   * - Updates availability (required)
   */
  private async _createBookingCore(params: BookingCoreParams): Promise<Booking> {
    const { bookingData, services, addresses, business } = params;

    try {
      assert(business, 'Business is required for booking creation to update availability');

      // Step 1: Create addresses in database (if provided)
      if (addresses && addresses.length > 0) {
        await this.createAddresses(addresses);
      }

      // Step 2: Create the booking in database
      const createdBooking = await this.create(bookingData);

      // Step 3: Create booking services (many-to-many relationship)
      await this.createBookingServices(createdBooking.id, services);

      // Step 4: Update availability slots after successful booking creation
      await this.updateAvailabilityAfterBooking(createdBooking, business);

      return createdBooking;

    } catch (error) {
      throw new Error(`Failed to create booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create addresses in database
   * Accepts both BookingAddress[] (quote flow) and CreateAddressData[] (manual entry)
   */
  private async createAddresses(addresses: Array<BookingAddress | CreateAddressData>): Promise<void> {
    for (const addr of addresses) {
      // Check if it's a BookingAddress (nested) or CreateAddressData (flat)
      if ('address' in addr && addr.address) {
        // BookingAddress: nested structure from quote flow
        await this.addressesRepository.create({
          service_id: addr.service_id!,
          type: addr.address.type,
          address_line_1: addr.address.address_line_1,
          address_line_2: addr.address.address_line_2,
          city: addr.address.city,
          postcode: addr.address.postcode,
          state: addr.address.state,
          country: addr.address.country
        });
      } else {
        // CreateAddressData: flat structure from manual entry
        await this.addressesRepository.create(addr as CreateAddressData);
      }
    }
  }

  /**
   * Create booking services relationship (multiple services per booking)
   */
  private async createBookingServices(
    bookingId: string,
    services: Array<{ service_id: string; quantity?: number }>
  ): Promise<void> {
    for (const serviceItem of services) {
      await this.bookingServiceRepository.create({
        booking_id: bookingId,
        service_id: serviceItem.service_id
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
      // Don't throw error to avoid breaking booking creation - availability update is non-critical
    }
  }
}
