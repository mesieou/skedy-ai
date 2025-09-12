/**
 * MVP Schema Manager - Simplified & Optimized
 *
 * Manages function schemas with clear separation:
 * - Core booking functions (static)
 * - Knowledge functions (static)
 * - Dynamic functions (context-dependent)
 */

import type { BusinessContext } from '../../shared/lib/database/types/business-context';
import type { Service } from '../../shared/lib/database/types/service';
import type { ToolSchema } from './types';

export class MVPSchemaManager {

  // ============================================================================
  // CORE STATIC SCHEMAS (Always Available)
  // ============================================================================

  static getCoreBookingSchemas(businessContext: BusinessContext): ToolSchema[] {
    const schemas = [
      this.generateServiceSelectionSchema(businessContext),
      this.generateCheckDayAvailabilitySchema(),
      this.generateCheckUserExistsSchema(),
      this.generateCreateUserSchema(),
      this.generateCreateBookingSchema()
    ];

    console.log('🔧 [MVP Schema] Generated core booking schemas:');
    schemas.forEach(schema => {
      console.log(`  📋 ${schema.name}: ${schema.parameters.required?.join(', ') || 'none'}`);
    });

    return schemas;
  }

  // ============================================================================
  // KNOWLEDGE FUNCTION SCHEMAS (Customer Info Questions)
  // ============================================================================

  static getKnowledgeSchemas(): ToolSchema[] {
    const schemas = [
      this.generateServicesPricingSchema(),
      this.generateBusinessInformationSchema(),
      this.generateGeneralFaqsSchema(),
      this.generateEscalateSchema()
    ];

    console.log('🔧 [MVP Schema] Generated knowledge schemas (customer info):');
    schemas.forEach(schema => {
      console.log(`  📚 ${schema.name}: ${schema.description}`);
    });

    return schemas;
  }

  // ============================================================================
  // OBJECTION HANDLING SCHEMAS (Sales Tactics)
  // ============================================================================

  static getObjectionHandlingSchemas(): ToolSchema[] {
    const schemas = [
      this.generateObjectionHandlingSchema()
    ];

    console.log('🔧 [MVP Schema] Generated objection handling schemas (sales tactics):');
    schemas.forEach(schema => {
      console.log(`  🎯 ${schema.name}: ${schema.description}`);
    });

    return schemas;
  }

  // ============================================================================
  // DYNAMIC SCHEMAS (Context-Dependent)
  // ============================================================================

  static generateServiceSpecificQuoteSchema(service: Service): ToolSchema {
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

    console.log(`🔄 [MVP Schema] Generating dynamic quote schema for service: ${service.name}`);
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
        description: "Job scope",
        enum: serviceJobScopes
      };
      required.push('job_scope'); // Job scope is required when available
      console.log(`   ✅ Added job_scope property with options: [${serviceJobScopes.join(', ')}]`);
    }

    const schema = {
      type: "function",
      name: "get_quote",
      description: `Get quote for ${service.name}`,
      parameters: {
        type: "object",
        properties,
        required,
        additionalProperties: false
      }
    } as ToolSchema;

    console.log(`📤 [MVP Schema] Complete dynamic quote schema payload:`, JSON.stringify(schema, null, 2));

    return schema;
  }

  static getQuoteSelectionSchema(): ToolSchema {
    return {
      type: "function",
      name: "select_quote",
      description: "Select customer's quote choice",
      parameters: {
        type: "object",
        properties: {
          quote_choice: {
            type: "string",
            description: "Quote selection (amount or option)"
          }
        },
        required: ["quote_choice"],
        additionalProperties: false
      }
    };
  }

  // ============================================================================
  // CORE BOOKING SCHEMA GENERATORS
  // ============================================================================

  private static generateServiceSelectionSchema(businessContext: BusinessContext): ToolSchema {
    const serviceNames = businessContext.services.map(s => s.name);

    return {
      type: "function",
      name: "select_service",
      description: `Select service after customer confirms`,
      parameters: {
        type: "object",
        properties: {
          service_name: {
            type: "string",
            description: "Service name",
            enum: serviceNames
          }
        },
        required: ["service_name"],
        additionalProperties: false
      }
    };
  }

  private static generateCheckDayAvailabilitySchema(): ToolSchema {
    return {
      type: "function",
      name: "check_day_availability",
      description: "Check date availability (YYYY-MM-DD)",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date YYYY-MM-DD"
          }
        },
        required: ["date"],
        additionalProperties: false
      }
    };
  }

  private static generateCheckUserExistsSchema(): ToolSchema {
    return {
      type: "function",
      name: "check_user_exists",
      description: "Check if caller exists (auto phone)",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      }
    };
  }

  private static generateCreateUserSchema(): ToolSchema {
    return {
      type: "function",
      name: "create_user",
      description: "Create customer (auto phone)",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Full name"
          }
        },
        required: ["name"],
        additionalProperties: false
      }
    };
  }

  private static generateCreateBookingSchema(): ToolSchema {
    return {
      type: "function",
      name: "create_booking",
      description: "Create booking after quote+availability+user",
      parameters: {
        type: "object",
        properties: {
          preferred_date: {
            type: "string",
            description: "Date YYYY-MM-DD"
          },
          preferred_time: {
            type: "string",
            description: "Time HH:MM"
          },
          user_id: {
            type: "string",
            description: "User ID"
          }
        },
        required: ["preferred_date", "preferred_time", "user_id"],
        additionalProperties: false
      }
    };
  }

  // ============================================================================
  // KNOWLEDGE FUNCTION SCHEMA GENERATORS
  // ============================================================================

  private static generateServicesPricingSchema(): ToolSchema {
    return {
      type: "function",
      name: "get_services_pricing_info",
      description: "Get pricing & service details",
      parameters: {
        type: "object",
        properties: {
          service_name: {
            type: "string",
            description: "Service name (optional)"
          }
        },
        required: [],
        additionalProperties: false
      }
    };
  }

  private static generateBusinessInformationSchema(): ToolSchema {
    return {
      type: "function",
      name: "get_business_information",
      description: "Get business info (hours, areas, contact)",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Topic (optional)"
          }
        },
        required: [],
        additionalProperties: false
      }
    };
  }

  private static generateGeneralFaqsSchema(): ToolSchema {
    return {
      type: "function",
      name: "get_general_faqs",
      description: "Get general FAQs",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search term"
          }
        },
        required: [],
        additionalProperties: false
      }
    };
  }

  private static generateObjectionHandlingSchema(): ToolSchema {
    return {
      type: "function",
      name: "get_objection_handling_guidance",
      description: "Handle customer objections",
      parameters: {
        type: "object",
        properties: {
          objection_type: {
            type: "string",
            description: "Objection type",
            enum: ["price", "spouse_approval", "service_fit", "hesitation"]
          }
        },
        required: ["objection_type"],
        additionalProperties: false
      }
    };
  }

  private static generateEscalateSchema(): ToolSchema {
    return {
      type: "function",
      name: "escalate_conversation",
      description: "Escalate to human",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Reason"
          }
        },
        required: [],
        additionalProperties: false
      }
    };
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  private static convertRequirementToProperty(requirement: string): {
    type: string;
    description: string;
    enum?: string[];
    items?: { type: string };
    minimum?: number;
  } | null {
    switch (requirement) {
      case 'pickup_addresses':
        return {
          type: "array",
          description: "Pickup addresses",
          items: { type: "string" }
        };

      case 'dropoff_addresses':
        return {
          type: "array",
          description: "Dropoff addresses",
          items: { type: "string" }
        };

      case 'customer_address':
        return {
          type: "string",
          description: "Customer address"
        };

      case 'number_of_people':
        return {
          type: "integer",
          description: "People count",
          minimum: 1
        };

      case 'number_of_rooms':
        return {
          type: "integer",
          description: "Room count",
          minimum: 1
        };

      case 'square_meters':
        return {
          type: "number",
          description: "Square meters",
          minimum: 1
        };

      case 'number_of_vehicles':
        return {
          type: "integer",
          description: "Vehicle count",
          minimum: 1
        };

      case 'job_scope':
        // This is handled separately above
        return null;

      default:
        console.warn(`⚠️ [MVP Schema] Unknown requirement: ${requirement}`);
        return {
          type: "string",
          description: `${requirement} for the service`
        };
    }
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  static getAllStaticSchemas(businessContext: BusinessContext): ToolSchema[] {
    return [
      ...this.getCoreBookingSchemas(businessContext),
      ...this.getKnowledgeSchemas(),
      ...this.getObjectionHandlingSchemas()
    ];
  }

  static logSchemasSummary(schemas: ToolSchema[]): void {
    const coreSchemas = schemas.filter(s =>
      ['select_service', 'get_quote', 'check_day_availability', 'check_user_exists', 'create_user', 'create_booking'].includes(s.name)
    );

    const knowledgeSchemas = schemas.filter(s =>
      ['get_business_faqs', 'get_detailed_service_info', 'escalate_conversation'].includes(s.name)
    );

    const objectionSchemas = schemas.filter(s =>
      ['get_objection_handling_guidance'].includes(s.name)
    );

    const dynamicSchemas = schemas.filter(s =>
      ['select_quote'].includes(s.name)
    );

    console.log(`📊 [MVP Schema] Summary: ${schemas.length} total schemas`);
    console.log(`  🎯 Core booking: ${coreSchemas.length}`);
    console.log(`  📚 Knowledge (facts): ${knowledgeSchemas.length}`);
    console.log(`  💼 Objections (sales): ${objectionSchemas.length}`);
    console.log(`  ⚡ Dynamic: ${dynamicSchemas.length}`);
  }
}
