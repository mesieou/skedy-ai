/**
 * Quote Tool
 *
 * Enterprise quote generation service:
 * - Clean separation of concerns
 * - Proper type usage from official interfaces
 * - Scalable address handling
 * - No code duplication
 */

import type { BusinessContext } from '../../../shared/lib/database/types/business-context';
import type { Service } from '../../../shared/lib/database/types/service';
import type { Business } from '../../../shared/lib/database/types/business';
import type { CallContextManager } from '../../memory/call-context-manager';

import type { FunctionCallResult, QuoteFunctionArgs } from '../types';
import { BookingCalculator } from '../../../scheduling/lib/bookings/booking-calculator';
import { QuoteInputBuilder } from '../../../scheduling/lib/bookings/quote-input-builder';
import type { BookingCalculationResult } from '../../../scheduling/lib/types/booking-calculations';
import { createToolError } from '../../../shared/utils/error-utils';

// ============================================================================
// QUOTE TOOL SERVICE
// ============================================================================

export class QuoteTool {
  private readonly businessContext: BusinessContext;
  private readonly business: Business;
  private readonly bookingCalculator: BookingCalculator;
  private readonly callContextManager: CallContextManager;

  constructor(businessContext: BusinessContext, business: Business, callContextManager: CallContextManager) {
    this.businessContext = businessContext;
    this.business = business;
    this.bookingCalculator = new BookingCalculator();
    this.callContextManager = callContextManager;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Generate quote for the currently selected service
   */
  async getQuoteForSelectedService(args: QuoteFunctionArgs, callId: string): Promise<FunctionCallResult> {
    // Get the selected service from call context (set by select_service call)
    const service = await this.callContextManager.getSelectedService(callId);

    if (!service) {
      return createToolError(
        "No service selected",
        "Please select a service first using select_service() before requesting a quote."
      );
    }

    try {
      // Log requirement collection progress
      this.logRequirementProgress(args, service);

      const bookingInput = QuoteInputBuilder.buildBookingInput(args, service, this.businessContext);
      const quote = await this.bookingCalculator.calculateBooking(bookingInput, args.job_scope);

      this.logQuoteBreakdown(quote, service.name);

      return this.formatQuoteResponse(quote, service);

    } catch (error) {
      console.error('❌ Quote calculation failed:', error);
      return createToolError("Quote calculation failed", "Sorry, I couldn't calculate a quote right now. Please try again.");
    }
  }


  // ============================================================================
  // RESPONSE FORMATTING
  // ============================================================================

  private formatQuoteResponse(quote: BookingCalculationResult, service: Service): FunctionCallResult {
    return {
      success: true,
      data: {
        // Core booking information (matches Booking interface)
        service_name: service.name,
        total_estimate_amount: quote.total_estimate_amount,
        total_estimate_time_in_minutes: quote.total_estimate_time_in_minutes,
        deposit_amount: quote.deposit_amount,
        remaining_balance: quote.remaining_balance,
        deposit_paid: quote.deposit_paid,
        minimum_charge_applied: quote.minimum_charge_applied,
        currency: this.businessContext.businessInfo.currency_code,
        status: 'quote',

        // Organized breakdown for AI
        breakdown: this.createQuoteBreakdown(quote, service),

        // Complete price breakdown (ready for database)
        price_breakdown: quote.price_breakdown
      },
      message: this.formatQuoteMessage(quote, service.name)
    };
  }

  private createQuoteBreakdown(quote: BookingCalculationResult, service: Service) {
    const serviceBreakdown = quote.price_breakdown?.service_breakdowns?.[0];
    const travelBreakdown = quote.price_breakdown?.travel_breakdown;
    const feesBreakdown = quote.price_breakdown?.business_fees;

    return {
      labor: {
        cost: serviceBreakdown?.total_cost || 0,
        duration_mins: serviceBreakdown?.estimated_duration_mins || 0,
        rate_description: `${service.name} labor`
      },
      travel: {
        cost: travelBreakdown?.total_travel_cost || 0,
        duration_mins: travelBreakdown?.total_travel_time_mins || 0,
        distance_km: travelBreakdown?.total_distance_km || 0,
        rate_description: "Travel between locations"
      },
      fees: {
        gst_amount: feesBreakdown?.gst_amount || 0,
        gst_rate: feesBreakdown?.gst_rate || 0,
        platform_fee: feesBreakdown?.platform_fee || 0,
        payment_processing_fee: feesBreakdown?.payment_processing_fee || 0
      }
    };
  }

  private formatQuoteMessage(quote: BookingCalculationResult, serviceName: string): string {
    const currency = this.businessContext.businessInfo.currency_code;
    const hours = Math.round(quote.total_estimate_time_in_minutes / 60 * 10) / 10;

    let message = `Here's your quote for ${serviceName}:\n\n`;
    message += `💰 Total: ${currency} ${quote.total_estimate_amount}\n`;
    message += `⏱️ Estimated time: ${hours} hours\n`;

    if (quote.deposit_amount > 0) {
      message += `💳 Deposit required: ${currency} ${quote.deposit_amount}\n`;
    }

    message += `\nThis includes all labor, travel, and fees. Would you like to book this?`;
    return message;
  }

  // ============================================================================
  // LOGGING & DEBUGGING
  // ============================================================================

  private logRequirementProgress(args: QuoteFunctionArgs, service: Service): void {
    const requirements = service.ai_function_requirements || [];
    const collected = requirements.map(req => ({
      name: req,
      value: (args as Record<string, unknown>)[req],
      status: Boolean((args as Record<string, unknown>)[req])
    }));


    const collectedCount = collected.filter(r => r.status).length;
    if (collectedCount === requirements.length) {
    }
  }

  private logQuoteBreakdown(quote: BookingCalculationResult, serviceName: string): void {
    console.log(`💰 Quote breakdown for ${serviceName}:`, {
      total_amount: quote.total_estimate_amount,
      total_time: quote.total_estimate_time_in_minutes,
      labor: {
        cost: quote.price_breakdown?.service_breakdowns?.[0]?.total_cost || 0,
        duration_mins: quote.price_breakdown?.service_breakdowns?.[0]?.estimated_duration_mins || 0
      },
      travel: {
        cost: quote.price_breakdown?.travel_breakdown?.total_travel_cost || 0,
        duration_mins: quote.price_breakdown?.travel_breakdown?.total_travel_time_mins || 0,
        distance_km: quote.price_breakdown?.travel_breakdown?.total_distance_km || 0
      },
      fees: {
        gst: quote.price_breakdown?.business_fees?.gst_amount || 0,
        platform: quote.price_breakdown?.business_fees?.platform_fee || 0,
        payment: quote.price_breakdown?.business_fees?.payment_processing_fee || 0
      },
      deposit_amount: quote.deposit_amount,
      minimum_charge_applied: quote.minimum_charge_applied
    });
  }

}
