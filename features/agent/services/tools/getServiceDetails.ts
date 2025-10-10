import Fuse from 'fuse.js';
import { ServiceRepository } from '../../../shared/lib/database/repositories/service-repository';
import type { Session } from '../../sessions/session';
import { buildToolResponse } from '../helpers/responseBuilder';
import { PricingFormatter } from '../helpers/pricingFormatter';
import { sentry } from '@/features/shared/utils/sentryService';

/**
 * Get service details by service name with fuzzy matching
 * Uses session injection for minimal dependencies
 */
export async function getServiceDetails(
  args: { service_name: string },
  session: Session
) {
  const startTime = Date.now();

  try {
    // Add breadcrumb for service search start
    sentry.addBreadcrumb(`Searching for service`, 'tool-get-service-details', {
      sessionId: session.id,
      businessId: session.businessId,
      serviceName: args.service_name,
      availableServicesCount: session.serviceNames.length
    });

    // Configure Fuse.js for fuzzy searching service names from session
    const fuse = new Fuse(session.serviceNames, {
      threshold: 0.4, // 0.0 = exact match, 1.0 = match anything
      includeScore: true,
      minMatchCharLength: 2
    });

    // Search for the service name
    const searchResults = fuse.search(args.service_name);
    if (searchResults.length > 0) {
      // Found a good match - get the matched service name and fetch full details
      const matchedServiceName = searchResults[0].item;

      // Get full service details from database
      const serviceRepo = new ServiceRepository();
      const service = await serviceRepo.findOne({
        name: matchedServiceName,
        business_id: session.businessEntity.id
      });

      if (!service) {
        // This should not happen if services list is in sync, but handle gracefully
        const suggestions = session.serviceNames.slice(0, 3).join(', ');
        const errorMessage = `Service "${matchedServiceName}" is temporarily unavailable. Available services: ${suggestions}`;
        return buildToolResponse(null, errorMessage, false);
      }

      const duration = Date.now() - startTime;

      // Success breadcrumb
      sentry.addBreadcrumb(`Service found successfully`, 'tool-get-service-details', {
        sessionId: session.id,
        businessId: session.businessId,
        serviceName: args.service_name,
        matchedServiceName: matchedServiceName,
        serviceId: service.id,
        duration: duration,
        searchScore: searchResults[0].score
      });

      // Generate comprehensive pricing information
      const pricingInfo = PricingFormatter.formatServicePricingInfo(service);
      const completePricingOverview = PricingFormatter.generateCompletePricingOverview(service);

      // Create enhanced message with pricing details
      const enhancedMessage = `We offer ${service.name}. ${service.description}. ${completePricingOverview}`;

      // Success: return service data with comprehensive pricing information
      return buildToolResponse(
        {
          ...(service as unknown as Record<string, unknown>),
          pricing_tiers: pricingInfo.pricingTiers,
        },
        enhancedMessage,
        true
      );
    } else {
      // User input error - service name not found (fuzzy search failed)
      const suggestions = session.serviceNames.slice(0, 3).join(', ');
      const errorMessage = `Sorry, I couldn't find "${args.service_name}". Available services: ${suggestions}`;

      return buildToolResponse(null, errorMessage, false);
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    // Track service search error
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'tool_get_service_details',
      metadata: {
        duration: duration,
        serviceName: args.service_name,
        availableServicesCount: session.serviceNames.length,
        errorName: (error as Error).name
      }
    });

    // Internal system errors should still throw (database connection issues, etc.)
    throw error;
  }
}
