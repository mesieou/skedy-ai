import { ServiceRepository } from '../../../shared/lib/database/repositories/service-repository';
import { BookingCalculator } from '../../../scheduling/lib/bookings/quoteCalculation';
import { AddressValidator } from '../../../scheduling/lib/bookings/address-validator';
import type { QuoteRequestData } from '../../../scheduling/lib/types/booking-domain';
import type { Session } from '../../sessions/session';
import { buildToolResponse, buildQuoteToolResponse } from '../helpers/responseBuilder';
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

    // DEBUG: Log what addresses are in the quote request
    console.log(`📍 [GetQuote] QuoteRequest addresses count: ${quoteRequest.addresses?.length || 0}`);
    console.log(`📍 [GetQuote] QuoteRequest addresses:`, JSON.stringify(quoteRequest.addresses, null, 2));

    // Update session with detailed result and request data
    session.quotes.push({
      result: detailedResult,
      request: quoteRequest
    });
    // Don't auto-select the quote - let customer choose which one they want
    // session.selectedQuote = detailedResult;
    // session.selectedQuoteRequest = quoteRequest;

    // Create payment state if business requires deposit
    if (detailedResult.deposit_amount > 0) {
      session.depositPaymentState = {
        status: 'pending',
        quoteId: detailedResult.quote_id,
        stripeSessionId: undefined,
        paymentLink: undefined, // Will be set when payment link is created
        amount: detailedResult.deposit_amount,
        createdAt: Date.now()
      };
    }

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

    // Pass DetailedQuoteResult directly to business-specific formatter
    return buildQuoteToolResponse(
      detailedResult,
      session.businessEntity,
      service.name,
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
