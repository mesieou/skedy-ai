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
import type { Address } from '../../../shared/lib/database/types/addresses';
import { AddressType } from '../../../shared/lib/database/types/addresses';

import type { FunctionCallResult, QuoteFunctionArgs } from '../types';
import { BookingCalculator } from '../../../scheduling/lib/bookings/booking-calculator';
import type {
  BookingCalculationInput,
  BookingCalculationResult,
  BookingAddress,
  ServiceWithQuantity
} from '../../../scheduling/lib/types/booking-calculations';
import { AddressRole } from '../../../scheduling/lib/types/booking-calculations';
import { createToolError } from '../../../shared/utils/error-utils';

// ============================================================================
// QUOTE TOOL SERVICE
// ============================================================================

export class QuoteTool {
  private readonly businessContext: BusinessContext;
  private readonly business: Business;
  private readonly bookingCalculator: BookingCalculator;

  constructor(businessContext: BusinessContext, business: Business) {
    this.businessContext = businessContext;
    this.business = business;
    this.bookingCalculator = new BookingCalculator();
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Generate quote for selected service
   */
  async getQuoteForSelectedService(service: Service, args: QuoteFunctionArgs): Promise<FunctionCallResult> {
    try {
      console.log(`💰 Calculating quote for selected service: ${service.name}`);
      console.log(`📋 Quote args:`, args);

      const bookingInput = this.buildBookingInput(args, service);
      const quote = await this.bookingCalculator.calculateBooking(bookingInput, args.job_scope);

      this.logQuoteBreakdown(quote, service.name);

      return this.formatQuoteResponse(quote, service);

    } catch (error) {
      console.error('❌ Quote calculation failed:', error);
      return createToolError("Quote calculation failed", "Sorry, I couldn't calculate a quote right now. Please try again.");
    }
  }

  // ============================================================================
  // BOOKING INPUT PROCESSING
  // ============================================================================

  private buildBookingInput(args: QuoteFunctionArgs, service: Service): BookingCalculationInput {
    const addresses = this.buildAddressList(args, service);
    const serviceWithQuantity = this.buildServiceWithQuantity(service, args, addresses);

    return {
      services: [serviceWithQuantity],
      business: this.business,
      addresses
    };
  }

  private buildServiceWithQuantity(service: Service, args: QuoteFunctionArgs, addresses: BookingAddress[]): ServiceWithQuantity {
    const quantity = args.quantity || args.number_of_people || args.number_of_rooms || args.number_of_vehicles || 1;
    const serviceAddresses = addresses.filter(addr => addr.service_id === service.id);

    return {
      service,
      quantity,
      serviceAddresses
    };
  }
  // ============================================================================
  // ADDRESS PROCESSING
  // ============================================================================

  private buildAddressList(args: QuoteFunctionArgs, service: Service): BookingAddress[] {
    const addresses: BookingAddress[] = [];
    let sequenceOrder = 0;

    // Add business base address
    addresses.push(this.createBusinessBaseAddress(sequenceOrder++));

    // Add customer addresses
    addresses.push(...this.createCustomerAddresses(args, service, sequenceOrder));

    return addresses;
  }

  private createBusinessBaseAddress(sequenceOrder: number): BookingAddress {
    return {
      id: 'business_base',
      address: this.parseAddressString(this.businessContext.businessInfo.address),
      role: AddressRole.BUSINESS_BASE,
      sequence_order: sequenceOrder
    };
  }

  private createCustomerAddresses(args: QuoteFunctionArgs, service: Service, startingSequence: number): BookingAddress[] {
    const addresses: BookingAddress[] = [];
    let sequenceOrder = startingSequence;

    // Process pickup addresses
    if (args.pickup_addresses && Array.isArray(args.pickup_addresses)) {
      addresses.push(...this.createAddressesFromArray(args.pickup_addresses, AddressRole.PICKUP, service.id, sequenceOrder));
      sequenceOrder += args.pickup_addresses.length;
    } else if (args.pickup_address) {
      addresses.push(this.createSingleAddress(args.pickup_address, AddressRole.PICKUP, service.id, sequenceOrder++));
    }

    // Process dropoff addresses
    if (args.dropoff_addresses && Array.isArray(args.dropoff_addresses)) {
      addresses.push(...this.createAddressesFromArray(args.dropoff_addresses, AddressRole.DROPOFF, service.id, sequenceOrder));
      sequenceOrder += args.dropoff_addresses.length;
    } else if (args.dropoff_address) {
      addresses.push(this.createSingleAddress(args.dropoff_address, AddressRole.DROPOFF, service.id, sequenceOrder++));
    }

    // Process service address
    if (args.service_address) {
      addresses.push(this.createSingleAddress(args.service_address, AddressRole.SERVICE, service.id, sequenceOrder));
    }

    return addresses;
  }

  private createAddressesFromArray(addressStrings: string[], role: AddressRole, serviceId: string, startingSequence: number): BookingAddress[] {
    console.log(`📍 Processing ${addressStrings.length} ${role} addresses:`, addressStrings);

    return addressStrings.map((addressString, index) => {
      const parsedAddress = this.parseAddressString(addressString);
      console.log(`📍 Parsed ${role} address ${index}:`, parsedAddress);

      return {
        id: `${role}_${index}`,
        address: parsedAddress,
        role,
        sequence_order: startingSequence + index,
        service_id: serviceId
      };
    });
  }

  private createSingleAddress(addressString: string, role: AddressRole, serviceId: string, sequenceOrder: number): BookingAddress {
    return {
      id: role,
      address: this.parseAddressString(addressString),
      role,
      sequence_order: sequenceOrder,
      service_id: serviceId
    };
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

  // ============================================================================
  // ADDRESS PARSING UTILITIES
  // ============================================================================

  private parseAddressString(addressString: string): Address {
    const parts = addressString.split(',').map(p => p.trim());
    return {
      id: 'temp-' + Math.random().toString(36).substring(7),
      service_id: 'temp',
      type: AddressType.CUSTOMER,
      address_line_1: parts[0] || addressString,
      address_line_2: null,
      city: parts[1] || 'Melbourne',
      state: parts[2] || 'VIC',
      postcode: parts[3] || '3000',
      country: 'Australia',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
}
