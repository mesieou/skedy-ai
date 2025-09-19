import { ServiceRepository } from '../../../shared/lib/database/repositories/service-repository';
import { BookingCalculator } from '../../../scheduling/lib/bookings/quoteCalculation';
import { AddressValidator } from '../../../scheduling/lib/bookings/address-validator';
import type { QuoteRequestData } from '../../../scheduling/lib/types/booking-domain';
import type { Business } from '../../../shared/lib/database/types/business';
import type { Tool } from '../../../shared/lib/database/types/tools';
import { buildToolResponse } from './helpers/response-builder';

/**
 * Get quote for a service - uses response builder for consistency
 */
export async function getQuote(
  args: QuoteRequestData,
  business: Business,
  serviceId: string,
  tool: Tool
) {
  try {
    // Get service
    const serviceRepo = new ServiceRepository();
    const service = await serviceRepo.findOne({ id: serviceId });
    if (!service) {
      // User input error - invalid service ID
      return buildToolResponse(tool, null, `Service not found: ${serviceId}`);
    }

    // If service has address requirements, validate addresses
    const serviceRequirements = service.ai_function_requirements || [];
    const addressRequirements = ['pickup_addresses', 'dropoff_addresses', 'customer_address'];
    const hasAddressRequirements = serviceRequirements.some(req =>
      addressRequirements.includes(req)
    );

    if (hasAddressRequirements) {
      const addressValidator = new AddressValidator();
      const addressValidation = await addressValidator.validateQuoteAddresses(args);
      if (!addressValidation.isValid) {
        // User input error - invalid address data
        return buildToolResponse(tool, null, `Invalid address: ${addressValidation.message}`);
      }
    }

    // Calculate quote
    const calculator = new BookingCalculator();
    const quoteResult = await calculator.calculateBooking(args, service, business);

    // Map quote result to match tool template exactly
    const quoteData = {
      quote_id: quoteResult.quote_id,
      total_estimate_amount: quoteResult.total_estimate_amount,
      total_estimate_time_minutes: quoteResult.total_estimate_time_in_minutes,
      price_breakdown: quoteResult.price_breakdown,
      deposit_amount: quoteResult.deposit_amount
    };

    // Success - use response builder
    return buildToolResponse(tool, quoteData as unknown as Record<string, unknown>);

  } catch (error) {
    // Internal system errors should still throw (database issues, calculation failures, etc.)
    throw error;
  }
}
