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
   * Get quote for a service
   */
  async getQuote(args: QuoteFunctionArgs): Promise<FunctionCallResult> {
    try {
      // Find service by name
      if (!args.service_name) {
        return this.createErrorResult("Missing service_name", "Please specify which service you need.");
      }

      const service = this.findServiceByName(args.service_name);
      if (!service) {
        const availableServices = this.businessContext.services.map(s => s.name).join(', ');
        return this.createErrorResult(
          "Service not found",
          `Available services: ${availableServices}. Which one do you need?`
        );
      }

      // Convert args to booking input and calculate
      const bookingInput = this.convertToBookingInput(args, service);
      const quote = await this.bookingCalculator.calculateBooking(bookingInput);

      console.log(`💰 Quote calculated for ${service.name}: ${quote.total_estimate_amount}`);

      return this.createSuccessResult(
        {
          service_name: service.name,
          total_amount: quote.total_estimate_amount,
          total_time: quote.total_estimate_time_in_minutes,
          deposit_amount: quote.deposit_amount,
          currency: this.businessContext.businessInfo.currency_code,
          booking_status: 'pending'
        },
        this.formatQuoteMessage(quote, service.name, this.businessContext.businessInfo.currency_code)
      );

    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown error',
        "Sorry, I had trouble calculating that quote. Let me get someone to help you."
      );
    }
  }

  /**
   * Helper methods
   */
  private findServiceByName(serviceName: string): Service | null {
    return this.businessContext.services.find(s =>
      s.name.toLowerCase() === serviceName.toLowerCase()
    ) || null;
  }

  private createSuccessResult(data: Record<string, string | number | boolean | object>, message: string): FunctionCallResult {
    return { success: true, data, message };
  }

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

    // Add customer addresses based on service type
    if (args.pickup_address) {
      addresses.push({
        id: 'pickup',
        address: this.parseAddress(args.pickup_address),
        role: AddressRole.PICKUP,
        sequence_order: sequenceOrder++,
        service_id: service.id
      });
    }

    if (args.dropoff_address) {
      addresses.push({
        id: 'dropoff',
        address: this.parseAddress(args.dropoff_address),
        role: AddressRole.DROPOFF,
        sequence_order: sequenceOrder++,
        service_id: service.id
      });
    }

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
