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
import { BookingServiceSelector } from '../../../scheduling/lib/bookings/booking-service-selector';
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
   * Select a service - thin orchestrator for AI interactions
   */
  selectService(args: ServiceSelectionArgs): FunctionCallResult {

    // Delegate to domain service
    const result = BookingServiceSelector.selectService({
      service_name: args.service_name,
      business_context: this.businessContext
    });

    if (!result.success) {
      return createToolError("Service not found", result.error || "Unknown error");
    }

    // Format AI-friendly response
    return {
      success: true,
      message: `Selected "${args.service_name}". You can now request a quote with the specific requirements.`,
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
   * Get service by name - delegates to domain service
   */
  getServiceByName(serviceName: string): Service | null {
    return BookingServiceSelector.getServiceByName(serviceName, this.businessContext);
  }

  /**
   * Get all available services - delegates to domain service
   */
  getAvailableServices(): Service[] {
    return BookingServiceSelector.getAvailableServices(this.businessContext);
  }

}
