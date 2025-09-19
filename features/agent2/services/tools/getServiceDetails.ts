import Fuse from 'fuse.js';
import { ServiceRepository } from '../../../shared/lib/database/repositories/service-repository';
import type { Business } from '../../../shared/lib/database/types/business';
import type { Tool } from '../../../shared/lib/database/types/tools';
import { buildToolResponse } from './helpers/response-builder';

/**
 * Get service details by service name with fuzzy matching
 * Uses tool output template to dynamically structure response
 */
export async function getServiceDetails(
  args: { service_name: string },
  services: string[],
  business: Business,
  tool: Tool
) {
  // Configure Fuse.js for fuzzy searching service names
  const fuse = new Fuse(services, {
    threshold: 0.4, // 0.0 = exact match, 1.0 = match anything
    includeScore: true,
    minMatchCharLength: 2
  });

  // Search for the service name
  const searchResults = fuse.search(args.service_name);

  try {
    if (searchResults.length > 0) {
      // Found a good match - get the matched service name and fetch full details
      const matchedServiceName = searchResults[0].item;

      // Get full service details from database
      const serviceRepo = new ServiceRepository();
      const service = await serviceRepo.findOne({
        name: matchedServiceName,
        business_id: business.id
      });

      if (!service) {
        // This should not happen if services list is in sync, but handle gracefully
        const suggestions = services.slice(0, 3).join(', ');
        const errorMessage = `Service "${matchedServiceName}" is temporarily unavailable. Available services: ${suggestions}`;
        return buildToolResponse(tool, null, errorMessage);
      }

      // Success: return service data
      return buildToolResponse(tool, service as unknown as Record<string, unknown>);
    } else {
      // User input error - service name not found (fuzzy search failed)
      const suggestions = services.slice(0, 3).join(', ');
      const errorMessage = `Sorry, I couldn't find "${args.service_name}". Available services: ${suggestions}`;

      return buildToolResponse(tool, null, errorMessage);
    }
  } catch (error) {
    // Internal system errors should still throw (database connection issues, etc.)
    throw error;
  }
}
