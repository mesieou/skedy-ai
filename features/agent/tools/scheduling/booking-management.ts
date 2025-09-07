/**
 * Booking Management Tool (Agent Layer)
 *
 * Thin orchestrator for AI booking interactions:
 * - Agent-specific input validation
 * - AI-friendly response formatting
 * - Delegates domain logic to BookingService
 */

import { BookingsRepository } from '../../../shared/lib/database/repositories/bookings-respository';
import { UserRepository } from '../../../shared/lib/database/repositories/user-repository';
import { BookingCreationService } from '../../../scheduling/lib/bookings/booking-creation-service';
import type { Business } from '../../../shared/lib/database/types/business';
import type { User } from '../../../shared/lib/database/types/user';
import type { FunctionCallResult, CreateBookingFunctionArgs } from '../types';
import type { BookingCalculationResult } from '../../../scheduling/lib/types/booking-domain';
import { createToolError } from '../../../shared/utils/error-utils';
import { DateUtils } from '../../../shared/utils/date-utils';

// ============================================================================
// BOOKING MANAGEMENT TOOL
// ============================================================================

export class BookingManagementTool {
  private readonly bookingsRepository: BookingsRepository;
  private readonly userRepository: UserRepository;
  private readonly bookingCreationService: BookingCreationService;

  constructor() {
    this.bookingsRepository = new BookingsRepository();
    this.userRepository = new UserRepository();
    this.bookingCreationService = new BookingCreationService();
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Create a new booking with quote data and user information (fetches user from DB)
   */
  async createBooking(
    args: CreateBookingFunctionArgs,
    business: Business
  ): Promise<FunctionCallResult> {
    try {

      // Step 1: Validate all inputs and fetch user
      const validation = this.validateBookingInput(args);
      if (!validation.valid) {
        return createToolError("Invalid booking information", validation.message);
      }

      // Step 2: Fetch the user from database
      const user = await this.userRepository.findOne({ id: args.user_id, business_id: business.id });
      if (!user) {
        return createToolError(
          "User not found",
          "The specified user could not be found. Please create a user first."
        );
      }

      // Step 3: Check availability using domain service
      const availabilityCheck = await this.bookingCreationService.checkTimeSlotAvailability(
        args.preferred_date,
        args.preferred_time,
        business.id
      );

      if (!availabilityCheck.available) {
        return createToolError(
          "Time slot not available",
          availabilityCheck.message
        );
      }

      // Step 4: Create booking using domain service
      const bookingData = this.bookingCreationService.buildBookingData({
        quote_result: args.quote_data as unknown as BookingCalculationResult,
        preferred_date: args.preferred_date,
        preferred_time: args.preferred_time,
        user,
        business
      });

      // Step 5: Create the booking in the database
      const newBooking = await this.bookingsRepository.create(bookingData as unknown as Parameters<typeof this.bookingsRepository.create>[0]);

      // Step 6: Format AI-friendly response
      return this.formatBookingResponse(newBooking as unknown as Record<string, unknown>, args, business);

    } catch (error) {
      console.error('❌ [BookingManagementTool] Booking creation failed:', error);
      return createToolError(
        "Booking creation failed",
        "Sorry, I couldn't create your booking right now. Please try again."
      );
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Validate booking input data
   */
  private validateBookingInput(
    args: CreateBookingFunctionArgs
  ): { valid: boolean; message: string } {
    // Validate quote data
    if (!args.quote_data) {
      return { valid: false, message: "Quote data is required. Please get a quote first." };
    }

    if (!args.quote_data.total_estimate_amount || args.quote_data.total_estimate_amount <= 0) {
      return { valid: false, message: "Invalid quote amount." };
    }

    if (!args.quote_data.service_name) {
      return { valid: false, message: "Service name is required in quote data." };
    }

    // Validate date and time using DateUtils
    if (!args.preferred_date || !DateUtils.isValidDateFormat(args.preferred_date)) {
      return { valid: false, message: "Please provide a valid date in YYYY-MM-DD format." };
    }

    if (!args.preferred_time || !DateUtils.isValidTimeFormat(args.preferred_time)) {
      return { valid: false, message: "Please provide a valid time in HH:MM format." };
    }

    // Validate user ID
    if (!args.user_id) {
      return { valid: false, message: "User ID is required." };
    }

    return { valid: true, message: "" };
  }


  /**
   * Format AI-friendly booking response
   */
  private formatBookingResponse(
    booking: Record<string, unknown>,
    args: CreateBookingFunctionArgs,
    business: Business
  ): FunctionCallResult {
    const displayDate = DateUtils.formatDateForDisplay(args.preferred_date);
    const displayTime = DateUtils.formatTimeForDisplay(args.preferred_time);

    return {
      success: true,
      data: {
        booking_id: (booking.id as string) || 'pending',
        service_name: args.quote_data.service_name,
        date: args.preferred_date,
        time: args.preferred_time,
        total_amount: args.quote_data.total_estimate_amount,
        deposit_amount: args.quote_data.deposit_amount,
        status: 'pending',
        currency: business.currency_code
      },
      message: `Excellent! Your ${args.quote_data.service_name} is booked for ${displayTime} on ${displayDate}. ` +
               `Total: ${business.currency_code} ${args.quote_data.total_estimate_amount}` +
               (args.quote_data.deposit_amount > 0
                 ? `, with a ${business.currency_code} ${args.quote_data.deposit_amount} deposit required.`
                 : '.') +
               ` You'll receive a confirmation shortly!`
    };
  }

  /**
   * Create a new booking with user from context (event-driven, no DB fetch)
   */
  async createBookingWithUser(
    args: CreateBookingFunctionArgs,
    user: User,
    business: Business
  ): Promise<FunctionCallResult> {
    try {

      // Step 1: Validate inputs (no user validation needed - comes from context)
      const validation = this.validateBookingInputWithoutUser(args);
      if (!validation.valid) {
        return createToolError("Invalid booking information", validation.message);
      }

      // Step 2: Check availability using domain service
      const availabilityCheck = await this.bookingCreationService.checkTimeSlotAvailability(
        args.preferred_date,
        args.preferred_time,
        business.id
      );

      if (!availabilityCheck.available) {
        return createToolError(
          "Time slot not available",
          availabilityCheck.message
        );
      }

      // Step 3: Create booking using domain service
      const bookingData = this.bookingCreationService.buildBookingData({
        quote_result: args.quote_data as unknown as BookingCalculationResult,
        preferred_date: args.preferred_date,
        preferred_time: args.preferred_time,
        user,
        business
      });

      // Step 4: Create the booking in the database
      const newBooking = await this.bookingsRepository.create(bookingData as unknown as Parameters<typeof this.bookingsRepository.create>[0]);

      // Step 5: Format AI-friendly response
      return this.formatBookingResponse(newBooking as unknown as Record<string, unknown>, args, business);

    } catch (error) {
      console.error('❌ [BookingManagementTool] Booking creation with context user failed:', error);
      return createToolError(
        "Booking creation failed",
        "Sorry, I couldn't create your booking right now. Please try again."
      );
    }
  }

  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  /**
   * Validate booking input without user validation (for event-driven approach)
   */
  private validateBookingInputWithoutUser(args: CreateBookingFunctionArgs): { valid: boolean; message: string } {
    // Validate quote data
    if (!args.quote_data) {
      return { valid: false, message: "Quote data is required. Please get a quote first." };
    }

    if (!args.quote_data.total_estimate_amount || args.quote_data.total_estimate_amount <= 0) {
      return { valid: false, message: "Invalid quote amount." };
    }

    if (!args.quote_data.service_name) {
      return { valid: false, message: "Service name is required in quote data." };
    }

    // Validate date and time using DateUtils
    if (!args.preferred_date || !DateUtils.isValidDateFormat(args.preferred_date)) {
      return { valid: false, message: "Please provide a valid date in YYYY-MM-DD format." };
    }

    if (!args.preferred_time || !DateUtils.isValidTimeFormat(args.preferred_time)) {
      return { valid: false, message: "Please provide a valid time in HH:MM format." };
    }

    return { valid: true, message: "" };
  }

  /**
   * Create booking using event-driven context (AI-friendly wrapper)
   */
  async createBookingWithContext(
    args: CreateBookingFunctionArgs,
    business: Business,
    callId: string
  ): Promise<FunctionCallResult> {
    try {
      // Delegate to domain service for event-driven booking creation
      const result = await this.bookingCreationService.createBookingWithContext(
        args as unknown as Parameters<typeof this.bookingCreationService.createBookingWithContext>[0],
        business,
        callId
      );

      if (!result.success) {
        return createToolError("Booking creation failed", result.error || "Unknown error");
      }

      // Format AI-friendly response
      return this.formatBookingResponse(result.booking as unknown as Record<string, unknown>, args, business);

    } catch (error) {
      console.error('❌ [BookingManagementTool] Context booking failed:', error);
      return createToolError(
        "Booking creation failed",
        "Sorry, I couldn't create your booking right now. Please try again."
      );
    }
  }
}
