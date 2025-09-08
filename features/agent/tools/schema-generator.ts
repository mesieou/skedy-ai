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
   * Returns service selection and the 3 new static schemas
   */
  static getAllStaticSchemas(businessContext: BusinessContext): ToolSchema[] {
    const schemas = [
      this.generateServiceSelectionSchema(businessContext),
      this.generateCheckDayAvailabilitySchema(),
      this.generateCheckUserExistsSchema(),
      this.generateCreateUserSchema(),
      this.generateCreateBookingSchema(businessContext)
    ];

    // Log schemas being generated for OpenAI
    console.log('🔧 [SchemaManager] Generated static schemas for OpenAI:');
    schemas.forEach(schema => {
      console.log(`  📋 Function: ${schema.name}`);
      console.log(`     Description: ${schema.description}`);
      console.log(`     Required params: ${schema.parameters.required?.join(', ') || 'none'}`);
    });

    return schemas;
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
   * Generate check day availability schema (static)
   */
  static generateCheckDayAvailabilitySchema(): ToolSchema {
    return {
      type: "function",
      name: "check_day_availability",
      description: "Check availability for a specific date. Use this when customer asks about availability or wants to book a specific date.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "The date to check availability for in YYYY-MM-DD format (e.g., 2025-01-15)"
          }
        },
        required: ["date"],
        additionalProperties: false
      }
    } as ToolSchema;
  }

  /**
   * Generate check user exists schema (static)
   */
  static generateCheckUserExistsSchema(): ToolSchema {
    return {
      type: "function",
      name: "check_user_exists",
      description: "Check if a customer already exists in our system by phone number. Call this first before asking for their name.",
      parameters: {
        type: "object",
        properties: {
          phone_number: {
            type: "string",
            description: "The caller's phone number (from call context)"
          }
        },
        required: ["phone_number"],
        additionalProperties: false
      }
    } as ToolSchema;
  }

  /**
   * Generate create user schema (static)
   */
  static generateCreateUserSchema(): ToolSchema {
    return {
      type: "function",
      name: "create_user",
      description: "Create a new customer record with their name and phone number. ONLY call this AFTER asking for and receiving the customer's name. Use the caller's phone number from the call.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The customer's name (first name or full name)"
          },
          phone_number: {
            type: "string",
            description: "The caller's phone number (provided in the call context, NOT the business phone number)"
          }
        },
        required: ["name", "phone_number"],
        additionalProperties: false
      }
    } as ToolSchema;
  }

  /**
   * Generate create booking schema (static)
   */
  static generateCreateBookingSchema(businessContext: BusinessContext): ToolSchema {
    return {
      type: "function",
      name: "create_booking",
      description: `Create a booking for ${businessContext.businessInfo.name}. Use this only after getting a quote, creating a user, and checking availability. Quote data is automatically retrieved from context.`,
      parameters: {
        type: "object",
        properties: {
          preferred_date: {
            type: "string",
            description: "The customer's preferred date in YYYY-MM-DD format"
          },
          preferred_time: {
            type: "string",
            description: "The customer's preferred time in HH:MM format (24-hour)"
          },
          user_id: {
            type: "string",
            description: "The user ID from the create_user function"
          },
          confirmation_message: {
            type: "string",
            description: "Optional confirmation message or special instructions from the customer"
          }
        },
        required: ["preferred_date", "preferred_time", "user_id"],
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

    console.log(`🔄 [SchemaManager] Generating dynamic quote schema for service: ${service.name}`);
    console.log(`   📋 Service requirements: [${serviceRequirements.join(', ')}]`);
    console.log(`   🎯 Job scope options: [${serviceJobScopes.join(', ')}]`);

    // Convert requirements to schema properties and mark them as required
    serviceRequirements.forEach(requirement => {
      const property = this.convertRequirementToProperty(requirement);
      if (property) {
        properties[requirement] = property;
        required.push(requirement); // All generated requirements are required!
        console.log(`   ✅ Added property: ${requirement} (${property.type})`);
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
      console.log(`   ✅ Added job_scope property with options: [${serviceJobScopes.join(', ')}]`);
    }

    const schema = {
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

    console.log('📤 [SchemaManager] Complete dynamic quote schema payload:');
    console.log(JSON.stringify(schema, null, 2));

    return schema;
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
