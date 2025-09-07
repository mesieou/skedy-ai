/**
 * Booking Creation Service
 *
 * Domain service for creating and managing bookings:
 * - Booking data structure creation
 * - Time slot availability validation
 * - Business logic for booking lifecycle management
 */

import { BookingCalculator } from './booking-calculator';
import { AvailabilitySlotsRepository } from '../../../shared/lib/database/repositories/availability-slots-repository';
import { AvailabilityManager } from '../availability/availability-manager';
import { agentServiceContainer } from '../../../agent/memory/service-container';
import type {
  BookingCreationInput,
  CompleteBookingData,
  TimeSlotCheck,
  CreateBookingData,
  BookingService,
  Address,
  AddressType,
  Business,
  BookingCalculationResult,
  PriceBreakdown
} from '../types/booking-domain';
import { BookingStatus } from '../../../shared/lib/database/types/bookings';


// ============================================================================
// BOOKING SERVICE
// ============================================================================

export class BookingCreationService {
  private readonly availabilitySlotsRepository: AvailabilitySlotsRepository;

  constructor() {
    this.availabilitySlotsRepository = new AvailabilitySlotsRepository();
  }

  /**
   * Check if a specific time slot is still available
   */
  async checkTimeSlotAvailability(
    dateStr: string,
    timeStr: string,
    businessId: string
  ): Promise<TimeSlotCheck> {
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

      // Use AvailabilityManager to check the specific time slot
      // Note: Using empty business object as it's only used for logging in this context
      const emptyBusiness = {} as Business;
      const availabilityManager = new AvailabilityManager(currentAvailabilitySlots, emptyBusiness);
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
      console.error('❌ [BookingService] Availability check failed:', error);
      return {
        available: false,
        message: "Sorry, I couldn't check availability right now. Please try again."
      };
    }
  }

  /**
   * Build booking data structure for database creation
   * Uses quote price_breakdown which already contains all calculated data
   */
  buildBookingData(data: BookingCreationInput): CompleteBookingData {
    const { quote_result, preferred_date, preferred_time, user, business } = data;

    // Calculate timestamps using domain service
    const { start_at, end_at } = BookingCalculator.calculateBookingTimestamps(
      preferred_date,
      preferred_time,
      quote_result.total_estimate_time_in_minutes,
      business.time_zone
    );

    // Create booking entity from quote result (no duplication!)
    const booking: CreateBookingData = {
      user_id: user.id,
      business_id: business.id,
      status: BookingStatus.PENDING,
      total_estimate_amount: quote_result.total_estimate_amount,
      total_estimate_time_in_minutes: quote_result.total_estimate_time_in_minutes,
      start_at,
      end_at,
      deposit_amount: quote_result.deposit_amount,
      remaining_balance: quote_result.remaining_balance,
      deposit_paid: quote_result.deposit_paid,
      price_breakdown: quote_result.price_breakdown
    };

    // Extract services and addresses from the structured price breakdown
    const { booking_services, addresses } = this.extractEntitiesFromPriceBreakdown(quote_result.price_breakdown);

    return {
      booking,
      booking_services,
      addresses
    };
  }

  /**
   * Extract booking services and addresses from structured price breakdown
   * Uses the PriceBreakdown interface to build database entities
   */
  private extractEntitiesFromPriceBreakdown(priceBreakdown: PriceBreakdown): {
    booking_services: BookingService[];
    addresses: Address[];
  } {
    const booking_services: BookingService[] = [];
    const addresses: Address[] = [];

    // Extract services from service_breakdowns
    priceBreakdown.service_breakdowns.forEach(serviceBreakdown => {
      booking_services.push({
        id: '', // Will be set by repository
        booking_id: '', // Will be set by repository
        service_id: serviceBreakdown.service_id,
        quantity: serviceBreakdown.quantity,
        created_at: '',
        updated_at: ''
      });
    });

    // Extract addresses from travel_breakdown route segments
    priceBreakdown.travel_breakdown.route_segments.forEach((segment, index) => {
      // Add pickup address
      if (segment.from_address && !addresses.find(a => a.address_line_1 === segment.from_address.split(',')[0])) {
        addresses.push(this.parseAddressFromString(segment.from_address, `pickup_${index}`));
      }

      // Add dropoff address
      if (segment.to_address && !addresses.find(a => a.address_line_1 === segment.to_address.split(',')[0])) {
        addresses.push(this.parseAddressFromString(segment.to_address, `dropoff_${index}`));
      }
    });

    return {
      booking_services,
      addresses
    };
  }

  /**
   * Parse address string into Address entity
   */
  private parseAddressFromString(addressString: string, serviceId: string): Address {
    const parts = addressString.split(',').map(p => p.trim());
    return {
      id: '',
      service_id: serviceId,
      type: 'customer' as AddressType,
      address_line_1: parts[0] || addressString,
      address_line_2: null,
      city: parts[1] || 'Melbourne',
      state: parts[2] || 'VIC',
      postcode: parts[3] || '3000',
      country: 'Australia',
      created_at: '',
      updated_at: ''
    };
  }

  /**
   * Create booking with user from event-driven context (no DB fetch needed)
   */
  async createBookingWithContext(
    args: {
      quote_data: Record<string, unknown>;
      preferred_date: string;
      preferred_time: string;
      user_id: string;
    },
    business: Business,
    callId: string
  ): Promise<{ success: boolean; booking?: CompleteBookingData; error?: string }> {
    try {
      // Get user from call context (event-driven approach)
      const callContextManager = agentServiceContainer.createCallContextManager();
      const user = await callContextManager.getCurrentUser(callId);

      if (!user) {
        return {
          success: false,
          error: "Please create a user first before creating a booking."
        };
      }

      // Validate that the user_id matches the context
      if (args.user_id !== user.id) {
        return {
          success: false,
          error: "The user ID doesn't match the current call context."
        };
      }

      // Check availability
      const availabilityCheck = await this.checkTimeSlotAvailability(
        args.preferred_date,
        args.preferred_time,
        business.id
      );

      if (!availabilityCheck.available) {
        return {
          success: false,
          error: availabilityCheck.message
        };
      }

      // Build booking data
      const bookingData = this.buildBookingData({
        quote_result: args.quote_data as unknown as BookingCalculationResult, // TODO: Fix type conversion
        preferred_date: args.preferred_date,
        preferred_time: args.preferred_time,
        user,
        business
      });

      return {
        success: true,
        booking: bookingData
      };

    } catch (error) {
      console.error('❌ [BookingCreationService] Context booking failed:', error);
      return {
        success: false,
        error: "Sorry, I couldn't create your booking right now. Please try again."
      };
    }
  }
}
