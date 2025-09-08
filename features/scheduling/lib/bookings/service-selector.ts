/**
 * Booking Service Selector
 *
 * Domain service for selecting services in booking context:
 * - Service lookup and validation for bookings
 * - Booking-specific service metadata extraction
 * - Business logic for service selection in booking flow
 */

import type { BusinessContext } from '../../../shared/lib/database/types/business-context';
import type { Service } from '../../../shared/lib/database/types/service';

// ============================================================================
// TYPES
// ============================================================================

export interface ServiceSelectionInput {
  service_name: string;
  business_context: BusinessContext;
}

export interface ServiceSelectionResult {
  success: boolean;
  service?: Service;
  error?: string;
  requirements_preview?: string[];
  job_scope_options?: string[];
}

// ============================================================================
// SERVICE SELECTION SERVICE
// ============================================================================

export class ServiceSelector {
  /**
   * Find and validate service selection
   */
  static selectService(input: ServiceSelectionInput): ServiceSelectionResult {
    const { service_name, business_context } = input;
    console.log(`🎯 [ServiceSelectionService] Selecting service: ${service_name}`);

    // Find the service by name
    const service = business_context.services.find(s => s.name === service_name);

    if (!service) {
      const availableServices = business_context.services.map(s => s.name).join(', ');
      return {
        success: false,
        error: `Service "${service_name}" not available. Available services: ${availableServices}`
      };
    }

    console.log(`✅ [ServiceSelectionService] Service selected: ${service_name}`);

    return {
      success: true,
      service,
      requirements_preview: service.ai_function_requirements || [],
      job_scope_options: service.ai_job_scope_options || []
    };
  }

  /**
   * Get service by name
   */
  static getServiceByName(serviceName: string, businessContext: BusinessContext): Service | null {
    return businessContext.services.find(s => s.name === serviceName) || null;
  }

  /**
   * Get all available services for a business
   */
  static getAvailableServices(businessContext: BusinessContext): Service[] {
    return businessContext.services;
  }

  /**
   * Validate service availability
   */
  static isServiceAvailable(serviceName: string, businessContext: BusinessContext): boolean {
    return businessContext.services.some(s => s.name === serviceName);
  }
}
