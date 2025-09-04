/**
 * Schema Manager
 *
 * Manages both static and dynamic OpenAI function schemas
 * - Static schemas: Available at startup (service selection)
 * - Dynamic schemas: Generated after service selection (service-specific quotes)
 */

import type { BusinessContext } from '../../shared/lib/database/types/business-context';
import type { Service } from '../../shared/lib/database/types/service';
import type { ToolSchema } from './types';

export class SchemaManager {

  /**
   * Generate static schemas available at startup
   * Returns service selection schema only
   */
  static getAllStaticSchemas(businessContext: BusinessContext): ToolSchema[] {
    return [
      this.generateServiceSelectionSchema(businessContext)
    ];
  }

  /**
   * Generate service selection schema (static)
   */
  static generateServiceSelectionSchema(businessContext: BusinessContext): ToolSchema {
    return {
      type: "function",
      name: "select_service",
      description: `Select a service for quote calculation. Available services from ${businessContext.businessInfo.name}.`,
      parameters: {
        type: "object",
        properties: {
          service_name: {
            type: "string",
            description: `The service to select for quote calculation. Available services: ${businessContext.services.map(s => s.name).join(', ')}`,
            enum: businessContext.services.map(s => s.name)
          }
        },
        required: ["service_name"],
        additionalProperties: false
      }
    } as ToolSchema;
  }

  /**
   * Generate dynamic quote schema for a specific service
   */
  static generateServiceSpecificQuoteSchema(service: Service, businessInfo: BusinessContext['businessInfo']): ToolSchema {
    const properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: { type: string };
      minimum?: number;
    }> = {};
    const required: string[] = [];

    // No service_name needed - service already selected
    // Collect requirements and job scope options from the specific service
    const serviceRequirements = service.ai_function_requirements || [];
    const serviceJobScopes = service.ai_job_scope_options || [];

    // Convert requirements to schema properties and mark them as required
    serviceRequirements.forEach(requirement => {
      const property = this.convertRequirementToProperty(requirement);
      if (property) {
        properties[requirement] = property;
        required.push(requirement); // All generated requirements are required!
      }
    });

    // Add job_scope if service has job scope options (and mark as required)
    if (serviceJobScopes.length > 0) {
      properties.job_scope = {
        type: "string",
        description: "The scope or type of job being requested",
        enum: serviceJobScopes
      };
      required.push('job_scope'); // Job scope is required when available
    }

    return {
      type: "function",
      name: "get_quote",
      description: `Get a price quote for ${service.name} from ${businessInfo.name}. Provide as much detail as possible for accurate pricing.`,
      parameters: {
        type: "object",
        properties,
        required,
        additionalProperties: false
      }
    } as ToolSchema;
  }

  /**
   * Convert a requirement string to OpenAI property definition
   */
  private static convertRequirementToProperty(requirement: string): {
    type: string;
    description: string;
    items?: { type: string };
    minimum?: number;
  } | null {
    switch (requirement) {
      case 'pickup_addresses':
        return {
          type: "array",
          description: "Array of pickup addresses for the service",
          items: { type: "string" }
        };

      case 'dropoff_addresses':
        return {
          type: "array",
          description: "Array of dropoff addresses for the service",
          items: { type: "string" }
        };

      case 'customer_address':
        return {
          type: "string",
          description: "The customer's address where the service will be performed"
        };

      case 'number_of_people':
        return {
          type: "integer",
          description: "Number of people required for the service",
          minimum: 1
        };

      case 'number_of_rooms':
        return {
          type: "integer",
          description: "Number of rooms involved in the service",
          minimum: 1
        };

      case 'square_meters':
        return {
          type: "number",
          description: "Square meters of area to be serviced",
          minimum: 1
        };

      case 'number_of_vehicles':
        return {
          type: "integer",
          description: "Number of vehicles required for the service",
          minimum: 1
        };

      case 'job_scope':
        // This is handled separately above
        return null;

      default:
        // Generic string property for unknown requirements
        return {
          type: "string",
          description: `Additional requirement: ${requirement}`
        };
    }
  }
}
