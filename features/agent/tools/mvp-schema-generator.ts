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
        description: "The scope or type of job being requested",
        enum: serviceJobScopes
      };
      required.push('job_scope'); // Job scope is required when available
      console.log(`   ✅ Added job_scope property with options: [${serviceJobScopes.join(', ')}]`);
    }

    const schema = {
      type: "function",
      name: "get_quote",
      description: `Get a price quote for ${service.name}. Provide as much detail as possible for accurate pricing.`,
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
      description: "Select customer's chosen quote. ALWAYS call with quote_choice parameter - use 'option 1', 'option 2', or exact total amount.",
      parameters: {
        type: "object",
        properties: {
          quote_choice: {
            type: "string",
            description: "REQUIRED: Customer's quote selection. Use 'option 1', 'option 2', or exact total amount like '329' or '$425'"
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
      description: `Select a service for quote calculation. Available services from ${businessContext.businessInfo.name}.`,
      parameters: {
        type: "object",
        properties: {
          service_name: {
            type: "string",
            description: "The name of the service to select",
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
      description: "Check availability for a specific date. Use this when customer asks about availability or wants to book a specific date.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date to check in YYYY-MM-DD format"
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
      description: "Check if a customer already exists in our system by phone number. Call this first before asking for their name.",
      parameters: {
        type: "object",
        properties: {
          phone_number: {
            type: "string",
            description: "Customer's phone number to check"
          }
        },
        required: ["phone_number"],
        additionalProperties: false
      }
    };
  }

  private static generateCreateUserSchema(): ToolSchema {
    return {
      type: "function",
      name: "create_user",
      description: "Create a new customer record with their name and phone number. ONLY call this AFTER asking for and receiving the customer's name. Use the caller's phone number from the call.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Customer's full name"
          },
          phone_number: {
            type: "string",
            description: "Customer's phone number"
          }
        },
        required: ["name", "phone_number"],
        additionalProperties: false
      }
    };
  }

  private static generateCreateBookingSchema(): ToolSchema {
    return {
      type: "function",
      name: "create_booking",
      description: "Create a booking. Use this only after getting a quote, creating a user, and checking availability. Quote data is automatically retrieved from context.",
      parameters: {
        type: "object",
        properties: {
          preferred_date: {
            type: "string",
            description: "Preferred booking date in YYYY-MM-DD format"
          },
          preferred_time: {
            type: "string",
            description: "Preferred booking time in HH:MM format"
          },
          user_id: {
            type: "string",
            description: "User ID from create_user function"
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
      description: "Get service pricing, what's included, how services work. Use for: 'How much does X cost?', 'What's included?', 'How does Y service work?'",
      parameters: {
        type: "object",
        properties: {
          service_name: {
            type: "string",
            description: "Optional: specific service name, or leave empty for general pricing overview"
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
      description: "Get business operations info: hours, areas served, contact, policies, deposit requirements. Use for operational questions.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Optional: specific topic like 'hours', 'areas', 'contact', 'deposit', 'payment'"
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
      description: "LAST RESORT: Get general FAQs for unusual questions not covered by services_pricing or business_information.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search term to find relevant FAQs"
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
      description: "Get guidance for handling customer objections about price, timing, service fit, etc.",
      parameters: {
        type: "object",
        properties: {
          objection_type: {
            type: "string",
            description: "Type of objection to handle",
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
      description: "Escalate to human agent when AI cannot help or customer requests human assistance.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Reason for escalation"
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
          description: "Customer's address for the service"
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
          description: "Number of rooms for the service",
          minimum: 1
        };

      case 'square_meters':
        return {
          type: "number",
          description: "Square meters for the service",
          minimum: 1
        };

      case 'number_of_vehicles':
        return {
          type: "integer",
          description: "Number of vehicles required",
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
