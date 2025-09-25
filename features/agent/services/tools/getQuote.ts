import { ServiceRepository } from '../../../shared/lib/database/repositories/service-repository';
import { BookingCalculator } from '../../../scheduling/lib/bookings/quoteCalculation';
import { AddressValidator } from '../../../scheduling/lib/bookings/address-validator';
import type { QuoteRequestData } from '../../../scheduling/lib/types/booking-domain';
import type { QuoteResultInfo } from '../../../scheduling/lib/types/booking-calculations';
import type { Session } from '../../sessions/session';
import { buildToolResponse } from '../helpers/responseBuilder';
import { sentry } from '@/features/shared/utils/sentryService';

/**
 * Get quote for a service - uses session injection for minimal dependencies
 */
export async function getQuote(
  args: QuoteRequestData & { service_id: string },
  session: Session
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
      return buildToolResponse(null, `Service not found: ${args.service_id}`, false);
    }

    // If service has address requirements, validate addresses
    const serviceRequirements = service.ai_function_requirements || [];
    const addressRequirements = ['pickup_addresses', 'dropoff_addresses', 'customer_address'];
    const hasAddressRequirements = serviceRequirements.some(req =>
      addressRequirements.includes(req)
    );

    if (hasAddressRequirements) {
      const addressValidator = new AddressValidator();
      const addressValidation = await addressValidator.validateQuoteAddresses(args, serviceRequirements);
      if (!addressValidation.isValid) {
        // User input error - invalid address data
        return buildToolResponse(null, `Invalid address: ${addressValidation.message}`, false);
      }
    }

    // Calculate quote (returns separate result and request objects)
    const calculator = new BookingCalculator();
    const { quoteResult: detailedResult, quoteRequest } = await calculator.calculateBooking(args, service, session.businessEntity);

    // Update session with detailed result for internal use
    session.quotes.push(detailedResult);
    session.selectedQuote = detailedResult;
    session.selectedQuoteRequest = quoteRequest;

    const duration = Date.now() - startTime;

    // Success breadcrumb
    sentry.addBreadcrumb(`Quote calculated successfully`, 'tool-get-quote', {
      sessionId: session.id,
      businessId: session.businessId,
      serviceId: args.service_id,
      serviceName: service.name,
      duration: duration,
      totalAmount: detailedResult.total_estimate_amount,
      totalTimeMinutes: detailedResult.total_estimate_time_in_minutes
    });

    // Create simplified quote response using the proper interface
    const simplifiedQuoteResponse: QuoteResultInfo = {
      quote_id: detailedResult.quote_id,
      service_name: service.name,
      total_estimate_amount: detailedResult.total_estimate_amount,
      total_estimate_time_in_minutes: detailedResult.total_estimate_time_in_minutes,
      deposit_amount: detailedResult.deposit_amount,
      currency: session.businessEntity.currency_code,

      // Simple breakdown for customer questions (prevents AI from double-adding GST)
      labor_cost: detailedResult.price_breakdown?.service_breakdowns?.[0]?.total_cost || 0,
      travel_cost: detailedResult.price_breakdown?.travel_breakdown?.total_travel_cost || 0,
      gst_included: detailedResult.price_breakdown?.business_fees?.gst_amount || 0
    };

    return buildToolResponse(
      simplifiedQuoteResponse as unknown as Record<string, unknown>,
      `Here's your quote - total estimate cost is $${detailedResult.total_estimate_amount}. Deposit required: $${detailedResult.deposit_amount}. Remember this is an estimate and the final cost may vary.`,
      true
    );

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
