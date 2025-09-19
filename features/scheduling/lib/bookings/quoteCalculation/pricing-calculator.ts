import type { Service } from '../../../../shared/lib/database/types/service';
import type { Business } from '../../../../shared/lib/database/types/business';
import type { QuoteResultInfo, ServiceWithQuantity } from '../../types/booking-calculations';
import type { QuoteRequestData } from '../../types/booking-domain';
import { DateUtils } from '../../../../shared/utils/date-utils';

// Import our specialized calculators
import { TravelCalculator } from './helpers/travel-calculator';
import { ComponentCalculator } from './helpers/component-calculator';
import { BusinessFeesCalculator } from './helpers/business-fees-calculator';
import { QuoteIdGenerator } from './helpers/quote-id-generator';
import { AddressBuilder } from './helpers/address-builder';

/**
 * Thin booking calculator that orchestrates specialized calculators
 * Each calculator has a single responsibility for clean separation of concerns
 */
export class BookingCalculator {
  private travelCalculator: TravelCalculator;
  private componentCalculator: ComponentCalculator;
  private businessFeesCalculator: BusinessFeesCalculator;
  private quoteIdGenerator: QuoteIdGenerator;
  private addressBuilder: AddressBuilder;

  constructor() {
    this.travelCalculator = new TravelCalculator();
    this.componentCalculator = new ComponentCalculator();
    this.businessFeesCalculator = new BusinessFeesCalculator();
    this.quoteIdGenerator = new QuoteIdGenerator();
    this.addressBuilder = new AddressBuilder();
  }

  /**
   * Main entry point for booking calculations
   * Orchestrates all the specialized calculators
   */
  async calculateBooking(
    args: QuoteRequestData,
    service: Service,
    business: Business,
    quoteCounter: number = 1
  ): Promise<QuoteResultInfo> {
    try {
      // Extract quantity directly from raw args
      const quantity = args.quantity || args.number_of_people || args.number_of_rooms || args.number_of_vehicles || 1;

      // Build addresses using AddressBuilder
      const addresses = this.addressBuilder.buildAddressesFromRawArgs(args, service, business);

      // Build service with quantity structure
      const serviceWithQuantity: ServiceWithQuantity = {
        service,
        quantity,
        serviceAddresses: addresses.filter(addr => addr.service_id === service.id)
      };

      // Step 1: Calculate shared travel for the entire booking
      const travel_breakdown = await this.travelCalculator.calculateBookingTravel(
        [serviceWithQuantity],
        addresses,
        business
      );

      // Step 2: Calculate service cost using ComponentCalculator
      const breakdown = await this.componentCalculator.calculateServiceCost(
        serviceWithQuantity,
        args.job_scope
      );

      // Step 3: Calculate totals
      let total_estimate_amount = Math.round(breakdown.total_cost);
      const total_estimate_time_in_minutes = breakdown.estimated_duration_mins + travel_breakdown.total_travel_time_mins;

      // Add travel cost
      total_estimate_amount += Math.round(travel_breakdown.total_travel_cost);

      // Step 4: Add GST if required (before fees calculation)
      const subtotal_before_fees = total_estimate_amount;
      total_estimate_amount = this.businessFeesCalculator.addGSTIfRequired(total_estimate_amount, business);

      // Step 5: Calculate business fees
      const business_fees = this.businessFeesCalculator.calculateBusinessFees(subtotal_before_fees, business);

      // Add platform and processing fees (ensure they're numbers)
      const platformFee = business_fees.platform_fee || 0;
      const processingFee = business_fees.payment_processing_fee || 0;
      total_estimate_amount += Math.round(platformFee) + Math.round(processingFee);

      // Step 6: Apply minimum charge
      const { final_amount, minimum_charge_applied } = this.businessFeesCalculator.applyMinimumCharge(
        total_estimate_amount,
        business
      );
      total_estimate_amount = final_amount;

      // Step 7: Calculate deposit
      const deposit_amount = this.businessFeesCalculator.calculateDeposit(total_estimate_amount, business);
      const remaining_balance = total_estimate_amount; // Full amount for new bookings
      const deposit_paid = false; // Always false for new bookings

      // Step 8: Generate quote ID
      const quote_id = this.quoteIdGenerator.generateQuoteId(quoteCounter, service, quantity);

      return {
        quote_id,
        total_estimate_amount,
        total_estimate_time_in_minutes,
        minimum_charge_applied,
        deposit_amount,
        remaining_balance,
        deposit_paid,
        price_breakdown: {
          service_breakdowns: [breakdown],
          travel_breakdown,
          business_fees,
        },
      };
    } catch (error) {
      throw new Error(
        `Booking calculation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Calculate booking timestamps in UTC from date, time, and duration
   */
  static calculateBookingTimestamps(
    dateStr: string,
    timeStr: string,
    durationMinutes: number,
    businessTimezone: string
  ): { start_at: string; end_at: string } {
    // Convert local business time to UTC (timeStr is in business timezone)
    const start_at = DateUtils.convertBusinessTimeToUTC(dateStr, timeStr + ':00', businessTimezone);

    // Calculate end timestamp using DateUtils
    const end_at = DateUtils.calculateEndTimestamp(start_at, durationMinutes);

    return { start_at, end_at };
  }
}
