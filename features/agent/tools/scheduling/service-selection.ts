/**
 * Service Selection Tool (Agent Layer)
 *
 * Thin orchestrator for AI service selection interactions:
 * - Agent-specific response formatting
 * - Delegates domain logic to ServiceSelectionService
 */

import type { BusinessContext } from '../../../shared/lib/database/types/business-context';
import type { Service } from '../../../shared/lib/database/types/service';
import type { FunctionCallResult } from '../types';
import { ServiceSelector } from '../../../scheduling/lib/bookings/service-selector';
import { createToolError } from '../../../shared/utils/error-utils';

export interface ServiceSelectionArgs {
  service_name: string;
}

export class ServiceSelectionTool {
  private businessContext: BusinessContext;

  constructor(businessContext: BusinessContext) {
    this.businessContext = businessContext;
  }

  /**
   * Process AI service selection request - validates and returns formatted response
   */
  processServiceSelectionForAI(args: ServiceSelectionArgs): FunctionCallResult {

    // Delegate to domain service
    const result = ServiceSelector.selectService({
      service_name: args.service_name,
      business_context: this.businessContext
    });

    if (!result.success) {
      return createToolError("Service not found", result.error || "Unknown error");
    }

    // Format AI-friendly response with conversational message
    return {
      success: true,
      message: `Perfect! I've got "${args.service_name}" selected for you. Now I'll get you a proper quote with all the details.`,
      data: {
        selected_service: args.service_name,
        service_id: result.service!.id,
        requirements_preview: result.requirements_preview || [],
        job_scope_options: result.job_scope_options || [],
        description: result.service!.description,
        how_it_works: result.service!.how_it_works || ''
      }
    };
  }

  /**
   * Find service entity by name - pure data lookup
   */
  findServiceByName(serviceName: string): Service | null {
    return ServiceSelector.getServiceByName(serviceName, this.businessContext);
  }

  /**
   * Get all available services - delegates to domain service
   */
  getAvailableServices(): Service[] {
    return ServiceSelector.getAvailableServices(this.businessContext);
  }

}
