import { ServiceRepository } from '../../../shared/lib/database/repositories/service-repository';
import { BookingCalculator } from '../../../scheduling/lib/bookings/quoteCalculation';
import { AddressValidator } from '../../../scheduling/lib/bookings/address-validator';
import type { QuoteRequestData } from '../../../scheduling/lib/types/booking-domain';
import type { Session } from '../../sessions/session';
import type { Tool } from '../../../shared/lib/database/types/tools';
import { buildToolResponse } from '../helpers/responseBuilder';
import { sentry } from '@/features/shared/utils/sentryService';

/**
 * Get quote for a service - uses session injection for minimal dependencies
 */
export async function getQuote(
  args: QuoteRequestData & { service_id: string },
  session: Session,
  tool: Tool
) {
  const startTime = Date.now();

  try {
    // Add breadcrumb for quote calculation start
    sentry.addBreadcrumb(`Calculating quote`, 'tool-get-quote', {
      sessionId: session.id,
      businessId: session.businessId,
      serviceId: args.service_id,
      hasPickupAddresses: !!(args.pickup_addresses || args.pickup_address),
      hasDropoffAddresses: !!(args.dropoff_addresses || args.dropoff_address),
      hasCustomerAddress: !!(args.customer_addresses || args.service_address)
    });
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

    const duration = Date.now() - startTime;

    // Success breadcrumb
    sentry.addBreadcrumb(`Quote calculated successfully`, 'tool-get-quote', {
      sessionId: session.id,
      businessId: session.businessId,
      serviceId: args.service_id,
      serviceName: service.name,
      duration: duration,
      totalAmount: quoteResult.total_estimate_amount,
      totalTimeMinutes: quoteResult.total_estimate_time_in_minutes
    });

    // Return only the quote result (clean response for user)
    return buildToolResponse(tool, quoteResult as unknown as Record<string, unknown>);

  } catch (error) {
    const duration = Date.now() - startTime;

    // Track quote calculation error
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'tool_get_quote',
      metadata: {
        duration: duration,
        serviceId: args.service_id,
        hasPickupAddresses: !!(args.pickup_addresses || args.pickup_address),
        hasDropoffAddresses: !!(args.dropoff_addresses || args.dropoff_address),
        hasCustomerAddress: !!(args.customer_addresses || args.service_address),
        errorName: (error as Error).name
      }
    });

    // Internal system errors should still throw (database issues, calculation failures, etc.)
    throw error;
  }
}
