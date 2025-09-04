/**
 * Service Selection Tool
 *
 * Handles service selection for AI agent functions
 * Manages service validation and selection state
 */

import type { BusinessContext } from '../../../shared/lib/database/types/business-context';
import type { Service } from '../../../shared/lib/database/types/service';
import type { FunctionCallResult } from '../types';

export interface ServiceSelectionArgs {
  service_name: string;
}

export class ServiceSelectionTool {
  private businessContext: BusinessContext;

  constructor(businessContext: BusinessContext) {
    this.businessContext = businessContext;
  }

  /**
   * Select a service for quote generation
   */
  selectService(args: ServiceSelectionArgs): FunctionCallResult {
    const serviceName = args.service_name;
    console.log(`🎯 Selecting service: ${serviceName}`);

    // Find the service by name
    const service = this.businessContext.services.find(s => s.name === serviceName);

    if (!service) {
      const availableServices = this.businessContext.services.map(s => s.name).join(', ');
      return this.createErrorResult(
        "Service not found",
        `Service "${serviceName}" not available. Available services: ${availableServices}`
      );
    }

    console.log(`✅ Service selected: ${serviceName}`);

    return {
      success: true,
      message: `Selected "${serviceName}". You can now request a quote with the specific requirements.`,
      data: {
        selected_service: serviceName,
        service_id: service.id,
        requirements_preview: service.ai_function_requirements || [],
        job_scope_options: service.ai_job_scope_options || [],
        description: service.description,
        how_it_works: service.how_it_works || ''
      }
    };
  }

  /**
   * Get service by name
   */
  getServiceByName(serviceName: string): Service | null {
    return this.businessContext.services.find(s => s.name === serviceName) || null;
  }

  /**
   * Get all available services
   */
  getAvailableServices(): Service[] {
    return this.businessContext.services;
  }

  private createErrorResult(error: string, message: string): FunctionCallResult {
    return { success: false, error, message };
  }
}
