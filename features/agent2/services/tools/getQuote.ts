import { ServiceRepository } from '../../../shared/lib/database/repositories/service-repository';
import { BookingCalculator } from '../../../scheduling/lib/bookings/quoteCalculation';
import { AddressValidator } from '../../../scheduling/lib/bookings/address-validator';
import type { QuoteRequestData } from '../../../scheduling/lib/types/booking-domain';
import type { Session } from '../../sessions/session';
import type { Tool } from '../../../shared/lib/database/types/tools';
import { buildToolResponse } from './helpers/response-builder';

/**
 * Get quote for a service - uses session injection for minimal dependencies
 */
export async function getQuote(
  args: QuoteRequestData & { service_id: string },
  session: Session,
  tool: Tool
) {
  try {
    // Get service
    const serviceRepo = new ServiceRepository();
    const service = await serviceRepo.findOne({ id: args.service_id });
    if (!service) {
      // User input error - invalid service ID
      return buildToolResponse(tool, null, `Service not found: ${args.service_id}`);
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

    // Calculate quote (returns separate result and request objects)
    const calculator = new BookingCalculator();
    const { quoteResult, quoteRequest } = await calculator.calculateBooking(args, service, session.businessEntity);

    // Update session with both objects
    session.quotes.push(quoteResult);
    session.selectedQuote = quoteResult;
    session.selectedQuoteRequest = quoteRequest;
    session.conversationState = 'availability';

    // Return only the quote result (clean response for user)
    return buildToolResponse(tool, quoteResult as unknown as Record<string, unknown>);

  } catch (error) {
    // Internal system errors should still throw (database issues, calculation failures, etc.)
    throw error;
  }
}
