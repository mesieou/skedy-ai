/**
 * Booking Management Tool (Agent Layer)
 *
 * Thin orchestrator for AI booking interactions:
 * - Agent-specific input validation
 * - AI-friendly response formatting
 * - Delegates domain logic to BookingService
 */

import { UserRepository } from '../../../shared/lib/database/repositories/user-repository';
import { BookingOrchestrator } from '../../../scheduling/lib/bookings/booking-orchestrator';
import type { CallContextManager } from '../../memory/call-context-manager';
import type { Business } from '../../../shared/lib/database/types/business';
import type { Booking } from '../../../shared/lib/database/types/bookings';
import type { FunctionCallResult, CreateBookingFunctionArgs } from '../types';
import type { QuoteResultInfo } from '../../../scheduling/lib/types/booking-calculations';
import { createToolError } from '../../../shared/utils/error-utils';
import { DateUtils } from '../../../shared/utils/date-utils';

// ============================================================================
// BOOKING MANAGEMENT TOOL
// ============================================================================

export class BookingManagementTool {
  private readonly userRepository: UserRepository;
  private readonly bookingOrchestrator: BookingOrchestrator;
  private readonly callContextManager: CallContextManager;

  constructor(callContextManager: CallContextManager) {
    this.userRepository = new UserRepository();
    this.bookingOrchestrator = new BookingOrchestrator();
    this.callContextManager = callContextManager;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Create a new booking with quote data and user information (fetches user from DB)
   */
  async createBooking(
    args: CreateBookingFunctionArgs,
    business: Business,
    callId?: string
  ): Promise<FunctionCallResult> {
    try {

      // Step 1: Validate basic inputs (quote data comes from Redis)
      const validation = this.validateBookingRequestArgs(args);
      if (!validation.valid) {
        return createToolError("Invalid booking information", validation.message);
      }

      // Step 2: Get quote data from Redis context (where it should be)
      if (!callId) {
        return createToolError("Missing call context", "Booking creation requires call context.");
      }

      console.log(`🔍 [BookingTool] Retrieving quote result from Redis for callId: ${callId}`);
      const quoteResult = await this.callContextManager.getQuoteResultData(callId);
      console.log(`🔍 [BookingTool] Quote result from Redis:`, quoteResult ? `AUD ${quoteResult.total_estimate_amount}` : 'NOT FOUND');

      if (!quoteResult) {
        return createToolError("Quote result not found", "Please get a quote first before creating a booking.");
      }

      // Step 3: Get quote request info from Redis context
      const quoteRequest = await this.callContextManager.getQuoteRequestData(callId);
      console.log(`🔍 [BookingTool] Quote request from Redis:`, quoteRequest ? 'FOUND' : 'NOT FOUND');

      if (!quoteRequest) {
        return createToolError("Quote request not found", "Please get a quote first to establish booking context.");
      }

      // Step 4: Fetch the user from database
      const user = await this.userRepository.findOne({ id: args.user_id, business_id: business.id });
      if (!user) {
        return createToolError(
          "User not found",
          "The specified user could not be found. Please create a user first."
        );
      }

      // Step 5: Create booking using domain service (handles all orchestration)
      const result = await this.bookingOrchestrator.createBooking({
        quoteRequestData: quoteRequest,
        quoteResultData: quoteResult,
        userId: user.id,
        preferredDate: args.preferred_date,
        preferredTime: args.preferred_time
      });

      if (!result.success || !result.booking) {
        return createToolError("Booking creation failed", result.error || "Unknown error");
      }

      // Step 6: Format AI-friendly response (use quote result from Redis)
      return this.formatBookingResponseFromRedis(result.booking, args, business, quoteResult);

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
   * Validate booking request arguments
   */
  private validateBookingRequestArgs(
    args: CreateBookingFunctionArgs
  ): { valid: boolean; message: string } {
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
   * Format AI-friendly booking response using Redis quote data
   */
  private formatBookingResponseFromRedis(
    booking: Booking,
    args: CreateBookingFunctionArgs,
    business: Business,
    quoteResult: QuoteResultInfo
  ): FunctionCallResult {
    const displayDate = DateUtils.formatDateForDisplay(args.preferred_date);
    const displayTime = DateUtils.formatTimeForDisplay(args.preferred_time);

    return {
      success: true,
      data: {
        booking_id: booking.id,
        service_name: quoteResult.price_breakdown.service_breakdowns[0]?.service_name || 'Service',
        date: args.preferred_date,
        time: args.preferred_time,
        total_amount: quoteResult.total_estimate_amount,
        deposit_amount: quoteResult.deposit_amount,
        status: 'pending',
        currency: business.currency_code
      },
      message: `Excellent! Your booking is confirmed for ${displayTime} on ${displayDate}. ` +
               `Total: ${business.currency_code} ${quoteResult.total_estimate_amount}` +
               (quoteResult.deposit_amount > 0
                 ? `, with a ${business.currency_code} ${quoteResult.deposit_amount} deposit required.`
                 : '.') +
               ` You'll receive a confirmation shortly!`
    };
  }




}
