/**
 * Booking Orchestrator - Domain Orchestration
 *
 * Single responsibility: Orchestrate booking creation with proper separation of concerns
 * - Uses AvailabilityManager for all availability logic
 * - Uses PricingCalculator for pure calculations only
 * - Uses BookingsRepository for data persistence
 */

import { BookingsRepository } from '../../../shared/lib/database/repositories/bookings-respository';
import { AvailabilitySlotsRepository } from '../../../shared/lib/database/repositories/availability-slots-repository';
import { AvailabilityManager } from '../availability/availability-manager';
import type { QuoteRequestInfo, QuoteResultInfo } from '../types/booking-calculations';
import type { Business } from '../../../shared/lib/database/types/business';
import type { Booking } from '../../../shared/lib/database/types/bookings';
import { DateUtils } from '../../../shared/utils/date-utils';

export interface CreateBookingRequest {
  quoteRequestData: QuoteRequestInfo;
  quoteResultData: QuoteResultInfo;
  userId: string;
  preferredDate: string;
  preferredTime: string;
}

export interface BookingServiceResult {
  success: boolean;
  booking?: Booking;
  error?: string;
}

export class BookingOrchestrator {
  private readonly bookingsRepository: BookingsRepository;
  private readonly availabilitySlotsRepository: AvailabilitySlotsRepository;

  constructor() {
    this.bookingsRepository = new BookingsRepository();
    this.availabilitySlotsRepository = new AvailabilitySlotsRepository();
  }

  /**
   * Create booking with pre-calculated pricing and availability validation
   */
  async createBooking(request: CreateBookingRequest): Promise<BookingServiceResult> {
    const { quoteRequestData, quoteResultData, userId, preferredDate, preferredTime } = request;
    const business = quoteRequestData.business;

    try {
      // Step 1: Validate availability using AvailabilityManager
      const availabilityCheck = await this.validateTimeSlotAvailability(
        preferredDate,
        preferredTime,
        business.id
      );

      if (!availabilityCheck.available) {
        return {
          success: false,
          error: availabilityCheck.message
        };
      }

      // Step 2: Calculate booking timestamps
      const { start_at } = this.calculateBookingTimestamps(
        preferredDate,
        preferredTime,
        quoteResultData.total_estimate_time_in_minutes,
        business.time_zone
      );

      // Step 3: Create booking with pre-calculated data (no recalculation)
      const booking = await this.bookingsRepository.createBookingWithServicesAndAddresses(
        quoteRequestData,
        userId,
        start_at,
        quoteResultData
      );

      return {
        success: true,
        booking
      };

    } catch (error) {
      console.error('❌ [BookingService] Booking creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate time slot availability using AvailabilityManager
   */
  private async validateTimeSlotAvailability(
    dateStr: string,
    timeStr: string,
    businessId: string
  ): Promise<{ available: boolean; message: string }> {
    try {
      // Get current availability slots for the business
      const currentAvailabilitySlots = await this.availabilitySlotsRepository.findOne({
        business_id: businessId
      });

      if (!currentAvailabilitySlots) {
        return {
          available: false,
          message: "Sorry, we don't have availability data. Please contact us directly."
        };
      }

      // Use AvailabilityManager for all availability logic
      const business = { id: businessId } as Business; // Minimal business object for AvailabilityManager
      const availabilityManager = new AvailabilityManager(currentAvailabilitySlots, business);
      const dayAvailability = availabilityManager.checkDayAvailability(dateStr);

      if (!dayAvailability.success || dayAvailability.availableSlots.length === 0) {
        return {
          available: false,
          message: `Sorry, ${dateStr} is fully booked. Please choose another date.`
        };
      }

      // Check if the specific time slot is available
      const requestedSlot = dayAvailability.availableSlots.find(slot => slot.time === timeStr);

      if (!requestedSlot || requestedSlot.providerCount === 0) {
        return {
          available: false,
          message: `Sorry, ${timeStr} on ${dateStr} is no longer available. Please choose another time.`
        };
      }

      return { available: true, message: "Time slot is available" };

    } catch (error) {
      console.error('❌ [BookingService] Availability validation failed:', error);
      return {
        available: false,
        message: "Sorry, I couldn't check availability right now. Please try again."
      };
    }
  }

  /**
   * Calculate booking timestamps (pure utility function)
   */
  private calculateBookingTimestamps(
    dateStr: string,
    timeStr: string,
    durationMinutes: number,
    businessTimezone: string
  ): { start_at: string; end_at: string } {
    // Convert local business time to UTC
    const start_at = DateUtils.convertBusinessTimeToUTC(dateStr, timeStr + ':00', businessTimezone);
    const end_at = DateUtils.calculateEndTimestamp(start_at, durationMinutes);

    return { start_at, end_at };
  }
}
