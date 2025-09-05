/**
 * Quote Tool
 *
 * Handles all quote-related agent functions
 * Connects agent conversations to booking calculator
 */

import type { BusinessContext } from '../../../shared/lib/database/types/business-context';
import type { Service } from '../../../shared/lib/database/types/service';
import type { Business } from '../../../shared/lib/database/types/business';
import type { FunctionCallResult, QuoteFunctionArgs } from '../types';
import { BookingCalculator } from '../../../scheduling/lib/bookings/booking-calculator';
import type { BookingCalculationInput, BookingAddress } from '../../../scheduling/lib/types/booking-calculations';
import { AddressRole } from '../../../scheduling/lib/types/booking-calculations';
import type { Address } from '../../../shared/lib/database/types/addresses';
import { AddressType } from '../../../shared/lib/database/types/addresses';

export class QuoteTool {
  private businessContext: BusinessContext;
  private business: Business;
  private bookingCalculator: BookingCalculator;

  constructor(businessContext: BusinessContext, business: Business) {
    this.businessContext = businessContext;
    this.business = business;
    this.bookingCalculator = new BookingCalculator();
  }

  /**
   * Get quote for a pre-selected service (new two-step flow)
   */
  async getQuoteForSelectedService(service: Service, args: QuoteFunctionArgs): Promise<FunctionCallResult> {
    try {
      console.log(`💰 Calculating quote for selected service: ${service.name}`);
      console.log(`📋 Quote args:`, args);

      // Convert args to booking input and calculate
      const bookingInput = this.convertToBookingInput(args, service);
      console.log(`📋 Booking input:`, JSON.stringify(bookingInput, null, 2));

      const quote = await this.bookingCalculator.calculateBooking(bookingInput, args.job_scope);
      console.log(`💰 Quote breakdown organized:`, {
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

      console.log(`💰 Quote calculated for ${service.name}: ${quote.total_estimate_amount}`);

      return {
        success: true,
        data: {
          // Core booking information (matches database structure)
          service_name: service.name,
          total_estimate_amount: quote.total_estimate_amount,
          total_estimate_time_in_minutes: quote.total_estimate_time_in_minutes,
          deposit_amount: quote.deposit_amount,
          remaining_balance: quote.remaining_balance,
          deposit_paid: quote.deposit_paid,
          minimum_charge_applied: quote.minimum_charge_applied,
          currency: this.businessContext.businessInfo.currency_code,
          status: 'quote', // This is a quote, not a booking yet

          // Organized breakdown for AI and customer
          breakdown: {
            labor: {
              cost: quote.price_breakdown?.service_breakdowns?.[0]?.total_cost || 0,
              duration_mins: quote.price_breakdown?.service_breakdowns?.[0]?.estimated_duration_mins || 0,
              rate_description: `${service.name} labor`
            },
            travel: {
              cost: quote.price_breakdown?.travel_breakdown?.total_travel_cost || 0,
              duration_mins: quote.price_breakdown?.travel_breakdown?.total_travel_time_mins || 0,
              distance_km: quote.price_breakdown?.travel_breakdown?.total_distance_km || 0,
              rate_description: "Travel between locations"
            },
            fees: {
              gst_amount: quote.price_breakdown?.business_fees?.gst_amount || 0,
              gst_rate: quote.price_breakdown?.business_fees?.gst_rate || 0,
              platform_fee: quote.price_breakdown?.business_fees?.platform_fee || 0,
              payment_processing_fee: quote.price_breakdown?.business_fees?.payment_processing_fee || 0
            }
          },

          // Complete price breakdown (ready for database if needed)
          price_breakdown: quote.price_breakdown
        },
        message: this.formatQuoteMessage(quote, service.name, this.businessContext.businessInfo.currency_code)
      };
    } catch (error) {
      console.error('❌ Quote calculation failed:', error);
      return this.createErrorResult("Quote calculation failed", "Sorry, I couldn't calculate a quote right now. Please try again.");
    }
  }


  /**
   * Helper methods
   */


  private createErrorResult(error: string, message: string): FunctionCallResult {
    return { success: false, error, message };
  }

  /**
   * Convert function arguments to BookingCalculationInput
   */
  private convertToBookingInput(args: QuoteFunctionArgs, service: Service): BookingCalculationInput {
    const addresses: BookingAddress[] = [];
    let sequenceOrder = 0;

    // Add business base address
    addresses.push({
      id: 'business_base',
      address: this.parseAddress(this.businessContext.businessInfo.address),
      role: AddressRole.BUSINESS_BASE,
      sequence_order: sequenceOrder++
    });

    // Add customer addresses based on service type (handle both singular and plural)

    // Handle pickup addresses (plural array)
    if (args.pickup_addresses && Array.isArray(args.pickup_addresses)) {
      console.log(`📍 Processing ${args.pickup_addresses.length} pickup addresses:`, args.pickup_addresses);
      args.pickup_addresses.forEach((address, index) => {
        const parsedAddress = this.parseAddress(address);
        console.log(`📍 Parsed pickup address ${index}:`, parsedAddress);
        addresses.push({
          id: `pickup_${index}`,
          address: parsedAddress,
          role: AddressRole.PICKUP,
          sequence_order: sequenceOrder++,
          service_id: service.id
        });
      });
    } else if (args.pickup_address) {
      // Fallback to singular
      addresses.push({
        id: 'pickup',
        address: this.parseAddress(args.pickup_address),
        role: AddressRole.PICKUP,
        sequence_order: sequenceOrder++,
        service_id: service.id
      });
    }

    // Handle dropoff addresses (plural array)
    if (args.dropoff_addresses && Array.isArray(args.dropoff_addresses)) {
      console.log(`📍 Processing ${args.dropoff_addresses.length} dropoff addresses:`, args.dropoff_addresses);
      args.dropoff_addresses.forEach((address, index) => {
        const parsedAddress = this.parseAddress(address);
        console.log(`📍 Parsed dropoff address ${index}:`, parsedAddress);
        addresses.push({
          id: `dropoff_${index}`,
          address: parsedAddress,
          role: AddressRole.DROPOFF,
          sequence_order: sequenceOrder++,
          service_id: service.id
        });
      });
    } else if (args.dropoff_address) {
      // Fallback to singular
      addresses.push({
        id: 'dropoff',
        address: this.parseAddress(args.dropoff_address),
        role: AddressRole.DROPOFF,
        sequence_order: sequenceOrder++,
        service_id: service.id
      });
    }

    // Handle service addresses (keep existing logic for single address)
    if (args.service_address) {
      addresses.push({
        id: 'service',
        address: this.parseAddress(args.service_address),
        role: AddressRole.SERVICE,
        sequence_order: sequenceOrder++,
        service_id: service.id
      });
    }

    return {
      services: [{
        service: service,
        quantity: args.quantity || args.number_of_people || args.number_of_rooms || args.number_of_vehicles || 1,
        serviceAddresses: addresses.filter(addr => addr.service_id === service.id)
      }],
      business: this.business,
      addresses: addresses
    };
  }

  /**
   * Parse address string into Address object
   */
  private parseAddress(addressString: string): Address {
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

  /**
   * Format quote result into user-friendly message
   */
  private formatQuoteMessage(
    quote: { total_estimate_amount: number; total_estimate_time_in_minutes: number; deposit_amount: number },
    serviceName: string,
    currency: string
  ): string {
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
}
