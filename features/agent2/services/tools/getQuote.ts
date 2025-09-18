import { ServiceRepository } from '../../../shared/lib/database/repositories/service-repository';
import { BookingCalculator } from '../../../scheduling/lib/bookings/pricing-calculator';
import { AddressValidator } from '../../../scheduling/lib/bookings/address-validator';
import type { QuoteRequestData } from '../../../scheduling/lib/types/booking-domain';
import type { Business } from '../../../shared/lib/database/types/business';

/**
 * Get quote for a service - simple and direct
 */
export async function getQuote(
  args: QuoteRequestData,
  business: Business,
  serviceId: string
) {
  // Get service
  const serviceRepo = new ServiceRepository();
  const service = await serviceRepo.findOne({ id: serviceId });
  if (!service) {
    throw new Error(`Service not found: ${serviceId}`);
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
      throw new Error(`Invalid address: ${addressValidation.message}`);
    }
  }

  // Calculate quote
  const calculator = new BookingCalculator();
  const quoteResult = await calculator.calculateBooking(args, service, business);

  // Format response (simple)
  const response = {
    service_name: service.name,
    total_amount: quoteResult.total_estimate_amount,
    total_time_minutes: quoteResult.total_estimate_time_in_minutes,
    deposit_amount: quoteResult.deposit_amount,
    currency: business.currency_code
  };

  // Return response
  return response;
}
