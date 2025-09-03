/**
 * Function Executor
 *
 * Streamlined execution of AI function calls with better error handling
 * Instance-based approach for better testability and dependency injection
 */

import type { BusinessContext } from '../../shared/lib/database/types/business-context';
import type { Service } from '../../shared/lib/database/types/service';
import type { Business } from '../../shared/lib/database/types/business';
import type { FunctionCallResult, QuoteFunctionArgs } from './types';
import { RequirementsEngine } from './requirements-engine';
import { BookingCalculator } from '../../scheduling/lib/bookings/booking-calculator';
import type { BookingCalculationInput, BookingAddress } from '../../scheduling/lib/types/booking-calculations';
import { AddressRole } from '../../scheduling/lib/types/booking-calculations';
import type { Address } from '../../shared/lib/database/types/addresses';
import { AddressType } from '../../shared/lib/database/types/addresses';

export class FunctionExecutor {
  private businessContext: BusinessContext;
  private requirementsEngine: RequirementsEngine;
  private bookingCalculator: BookingCalculator;

  constructor(businessContext: BusinessContext) {
    this.businessContext = businessContext;
    this.requirementsEngine = new RequirementsEngine(businessContext.businessInfo);
    this.bookingCalculator = new BookingCalculator();
  }

  /**
   * Execute get_quote_requirements function
   */
  async executeGetQuoteRequirements(args: { service_id: string }): Promise<FunctionCallResult> {
    try {
      const service = this.findServiceByName(args.service_id);
      if (!service) {
        const availableServices = this.businessContext.services.map(s => s.name).join(', ');
        return this.createErrorResult(
          "Service not found",
          `Sorry, I couldn't find that service. Available services are: ${availableServices}. Which one are you interested in?`
        );
      }

      const requirements = this.requirementsEngine.analyzeService(service);
      const questions = this.requirementsEngine.generateQuestions(requirements);

      return this.createSuccessResult(
        {
          service_name: service.name,
          required_info: requirements,
          next_questions: questions
        },
        `For ${service.name}, I need: ${questions.join(', ')}`
      );
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown error',
        "Sorry, I had trouble analyzing that service. Can you try again?"
      );
    }
  }

  /**
   * Execute get_quote function
   */
  async executeGetQuote(args: QuoteFunctionArgs): Promise<FunctionCallResult> {
    try {
      if (!args.service_id) {
        return this.createErrorResult("Missing service_id", "Please specify which service you need.");
      }

      const service = this.findServiceByName(args.service_id);
      if (!service) {
        return this.createErrorResult("Service not found", "Sorry, I couldn't find that service.");
      }

      // Convert collected info to BookingCalculationInput
      const bookingInput = this.convertToBookingInput(args, service);

      // Calculate the quote using BookingCalculator
      const quote = await this.bookingCalculator.calculateBooking(bookingInput);

      return this.createSuccessResult(
        {
          quote,
          service_name: service.name,
          total_amount: quote.total_estimate_amount,
          total_time: quote.total_estimate_time_in_minutes,
          deposit_amount: quote.deposit_amount,
          currency: this.businessContext.businessInfo.currency_code
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
   * Execute multi-service quote function
   */
  async executeMultiServiceQuote(args: QuoteFunctionArgs): Promise<FunctionCallResult> {
    try {
      if (!args.service_ids || args.service_ids.length === 0) {
        return this.createErrorResult("Missing service_ids", "Please specify which services you need.");
      }

      const services = args.service_ids
        .map(id => this.findServiceByName(id))
        .filter((service): service is NonNullable<typeof service> => service !== null);

      if (services.length === 0) {
        return this.createErrorResult("No valid services found", "Sorry, I couldn't find those services.");
      }

      // Calculate quotes for each service using BookingCalculator
      const quotes = await Promise.all(
        services.map(async service => {
          const serviceArgs = { ...args, service_id: service.id };
          const bookingInput = this.convertToBookingInput(serviceArgs, service);
          return this.bookingCalculator.calculateBooking(bookingInput);
        })
      );

      const combinedQuote = this.combineQuotes(quotes, services);

      return this.createSuccessResult(
        {
          quote: combinedQuote,
          services: services.map(s => s.name),
          total_amount: combinedQuote.total_estimate_amount,
          total_time: combinedQuote.total_estimate_time_in_minutes,
          deposit_amount: combinedQuote.deposit_amount,
          currency: this.businessContext.businessInfo.currency_code
        },
        this.formatMultiServiceQuoteMessage(combinedQuote, services, this.businessContext.businessInfo.currency_code)
      );
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Unknown error',
        "Sorry, I had trouble calculating that multi-service quote. Let me get someone to help you."
      );
    }
  }

  /**
   * Execute booking functions (placeholder implementations)
   */
  async executeMakeBooking(args: { booking_id: string; confirmed_datetime: string; deposit_payment_method?: string }): Promise<FunctionCallResult> {
    // TODO: Implement booking logic
    return this.createSuccessResult(
      { booking_id: args.booking_id, status: 'confirmed', confirmed_datetime: args.confirmed_datetime },
      "Your booking has been confirmed!"
    );
  }

  async executeGetCustomerInfo(args: { customer_name: string; customer_phone?: string; issue_description: string }): Promise<FunctionCallResult> {
    return this.createSuccessResult(
      { customer_info: args },
      "Thank you for providing your details. Let me connect you with someone who can help."
    );
  }

  async executeEscalation(args: { reason: string }): Promise<FunctionCallResult> {
    return this.createSuccessResult(
      { escalation_reason: args.reason, status: 'escalated' },
      "I'm connecting you with a human agent now. They'll be with you shortly."
    );
  }

  /**
   * Helper methods
   */
    private findServiceByName(serviceName: string) {
    // Find service by name (case insensitive)
    return this.businessContext.services.find(s =>
      s.name.toLowerCase() === serviceName.toLowerCase()
    ) || null;
  }

  private findService(serviceId: string) {
    return this.businessContext.services.find(s => s.id === serviceId) || null;
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
  private convertToBookingInput(
    args: QuoteFunctionArgs,
    service: Service
  ): BookingCalculationInput {
    // Create addresses array based on service type and travel model
    const addresses: BookingAddress[] = [];
    let sequenceOrder = 0;

    // Add business base address if needed
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

    // Handle customer_addresses array
    if (args.customer_addresses && Array.isArray(args.customer_addresses)) {
      args.customer_addresses.forEach((addressStr, index) => {
        addresses.push({
          id: `customer_${index}`,
          address: this.parseAddress(addressStr),
          role: AddressRole.SERVICE,
          sequence_order: sequenceOrder++,
          service_id: service.id
        });
      });
    }

    return {
      services: [{
        service: service,
        quantity: args.quantity || args.number_of_people || args.number_of_rooms || args.number_of_vehicles || 1,
        serviceAddresses: addresses.filter(addr => addr.service_id === service.id)
      }],
      business: this.businessContext.businessInfo as unknown as Business,
      addresses: addresses
    };
  }

  /**
   * Parse address string into Address object
   */
  private parseAddress(addressString: string): Address {
    // Simple parsing - in production, use proper address parsing service
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
   * Combine multiple quotes for multi-service scenarios
   */
  private combineQuotes(quotes: Array<{ total_estimate_amount: number; total_estimate_time_in_minutes: number; deposit_amount: number }>, services: Array<{ name: string }>) {
    const totalAmount = quotes.reduce((sum, quote) => sum + quote.total_estimate_amount, 0);
    const totalTime = quotes.reduce((sum, quote) => sum + quote.total_estimate_time_in_minutes, 0);
    const totalDeposit = quotes.reduce((sum, quote) => sum + quote.deposit_amount, 0);

    return {
      total_estimate_amount: totalAmount,
      total_estimate_time_in_minutes: totalTime,
      deposit_amount: totalDeposit,
      individual_quotes: quotes,
      service_count: services.length
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

  /**
   * Format multi-service quote message
   */
  private formatMultiServiceQuoteMessage(
    combinedQuote: { total_estimate_amount: number; total_estimate_time_in_minutes: number; deposit_amount: number },
    services: Array<{ name: string }>,
    currency: string
  ): string {
    const hours = Math.round(combinedQuote.total_estimate_time_in_minutes / 60 * 10) / 10;
    const serviceNames = services.map(s => s.name).join(' + ');

    let message = `Here's your combined quote for ${serviceNames}:\n\n`;
    message += `💰 Total: ${currency} ${combinedQuote.total_estimate_amount}\n`;
    message += `⏱️ Estimated time: ${hours} hours\n`;

    if (combinedQuote.deposit_amount > 0) {
      message += `💳 Deposit required: ${currency} ${combinedQuote.deposit_amount}\n`;
    }

    message += `\nThis includes all services, labor, travel, and fees. Would you like to book these services?`;

    return message;
  }
}
