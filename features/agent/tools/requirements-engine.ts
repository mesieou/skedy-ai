/**
 * Requirements Engine
 *
 * Consolidated logic for analyzing services and generating requirements
 * Handles both single and multi-service scenarios with smart deduplication
 */

import type { Service } from '../../shared/lib/database/types/service';
import type { BusinessContext } from '../../shared/lib/database/types/business-context';
import { TravelChargingModel, PricingCombination, isMobileService, type PricingComponent, type PricingTier } from '../../shared/lib/database/types/service';
import { BusinessCategory } from '../../shared/lib/database/types/business';
import { computeDefaultTravelModel } from '../../shared/lib/database/utils/business-utils';
import type { QuoteRequirement, QuoteRequirements, ToolSchema } from './types';

export class RequirementsEngine {
  private businessInfo: BusinessContext['businessInfo'];

  constructor(businessInfo: BusinessContext['businessInfo']) {
    this.businessInfo = businessInfo;
  }

  /**
   * Analyze single service requirements
   */
  analyzeService(service: Service): QuoteRequirements {
    const requirements: QuoteRequirements = {
      basic: this.getBasicRequirements(service),
      addresses: this.getAddressRequirements(service),
      optional: []
    };

    return requirements;
  }

  /**
   * Analyze multiple services with smart deduplication
   */
  analyzeMultipleServices(services: Service[]): QuoteRequirements {
    const allRequirements = services.map(service => this.analyzeService(service));

    return this.mergeRequirements(allRequirements);
  }

  /**
   * Generate OpenAI function schema for a service
   */
  generateSchema(service: Service): ToolSchema {
    const requirements = this.analyzeService(service);
    const allRequirements = [...requirements.basic, ...requirements.addresses];

    const properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: { type: string };
    }> = {};
    const required: string[] = [];

    allRequirements.forEach(req => {
      properties[req.field] = {
        type: this.mapTypeToJsonSchema(req.type),
        description: req.description,
        ...(req.enum && { enum: req.enum })
      };

      if (req.required) {
        required.push(req.field);
      }
    });

    return {
      type: "function",
      function: {
        name: "get_quote",
        description: `Calculate quote and create PENDING booking for ${service.name}`,
        strict: true,
        parameters: {
          type: "object",
          properties,
          required,
          additionalProperties: false
        }
      }
    };
  }

  /**
   * Generate multi-service schema
   */
  generateMultiServiceSchema(services: Service[]): ToolSchema {
    const requirements = this.analyzeMultipleServices(services);
    const allRequirements = [...requirements.basic, ...requirements.addresses];

    const properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: { type: string };
    }> = {
      service_ids: {
        type: "array",
        items: { type: "string" },
        description: "Array of service IDs for multi-service quote"
      }
    };
    const required: string[] = ["service_ids"];

    allRequirements.forEach(req => {
      if (req.field === 'service_id') return; // Skip single service ID

      properties[req.field] = {
        type: this.mapTypeToJsonSchema(req.type),
        description: req.description,
        ...(req.enum && { enum: req.enum })
      };

      if (req.required) {
        required.push(req.field);
      }
    });

    return {
      type: "function",
      function: {
        name: "get_multi_service_quote",
        description: "Calculate combined quote for multiple services",
        strict: true,
        parameters: {
          type: "object",
          properties,
          required,
          additionalProperties: false
        }
      }
    };
  }

  /**
   * Generate user-friendly questions from requirements
   */
  generateQuestions(requirements: QuoteRequirements): string[] {
    const questions: string[] = [];

    // Address questions first
    requirements.addresses.forEach(req => {
      questions.push(this.getAddressQuestion(req.field));
    });

    // Then basic requirements
    requirements.basic
      .filter(req => req.field !== 'service_id') // Skip service selection
      .forEach(req => {
        questions.push(this.getBasicQuestion(req.field));
      });

    return questions.filter(Boolean);
  }

  /**
   * Get basic requirements for a service
   */
  private getBasicRequirements(service: Service): QuoteRequirement[] {
    const requirements: QuoteRequirement[] = [
      {
        field: 'service_id',
        label: 'Service Type',
        required: true,
        type: 'text',
        description: 'Which service they need'
      },
      {
        field: 'preferred_datetime',
        label: 'Preferred Date/Time',
        required: true,
        type: 'datetime',
        description: 'When they want the service'
      }
    ];

    // Add pricing-specific requirements
    if (service.pricing_config?.components) {
      service.pricing_config.components.forEach(component => {
        requirements.push(...this.getPricingRequirements(component));
      });
    }

    return this.deduplicateRequirements(requirements);
  }

  /**
   * Get address requirements for a service
   */
  private getAddressRequirements(service: Service): QuoteRequirement[] {
    if (!isMobileService(service)) {
      return [];
    }

    const travelModel = service.travel_charging_model ||
                       computeDefaultTravelModel(
                         this.businessInfo.business_category as BusinessCategory,
                         this.businessInfo.offer_mobile_services || false
                       ) ||
                       TravelChargingModel.FROM_BASE_TO_CUSTOMERS; // fallback

    return this.getTravelRequirements(travelModel);
  }

  /**
   * Get requirements based on pricing combination
   */
  private getPricingRequirements(component: PricingComponent): QuoteRequirement[] {
    const requirements: QuoteRequirement[] = [];
    const needsJobScope = component.tiers?.some((tier: PricingTier) =>
      tier.duration_estimate_mins && typeof tier.duration_estimate_mins === 'object'
    );

    // Add quantity requirements based on pricing combination
    const quantityReq = this.getQuantityRequirement(component.pricing_combination);
    if (quantityReq) {
      requirements.push(quantityReq);
    }

    // Add job scope if needed
    if (needsJobScope) {
      requirements.push({
        field: 'job_scope',
        label: 'Job Scope',
        required: true,
        type: 'text',
        description: 'Type of job (one item, few items, house move 1-bedroom, etc.)',
        enum: [
          "one_item", "few_items",
          "house_move_1_bedroom", "house_move_2_bedroom", "house_move_3_bedroom",
          "house_move_4_bedroom", "house_move_5_plus_bedroom",
          "office_move_small", "office_move_medium", "office_move_large"
        ]
      });
    }

    return requirements;
  }

  /**
   * Get quantity requirement for pricing combination
   */
  private getQuantityRequirement(pricingCombination: PricingCombination): QuoteRequirement | null {
    const quantityMap: Record<PricingCombination, QuoteRequirement | null> = {
      [PricingCombination.LABOR_PER_HOUR_PER_PERSON]: {
        field: 'number_of_people',
        label: 'Number of People/Workers',
        required: true,
        type: 'number',
        description: 'How many workers they need'
      },
      [PricingCombination.LABOR_PER_MINUTE_PER_PERSON]: {
        field: 'number_of_people',
        label: 'Number of People/Workers',
        required: true,
        type: 'number',
        description: 'How many workers they need'
      },
      [PricingCombination.SERVICE_PER_HOUR_PER_PERSON]: {
        field: 'number_of_people',
        label: 'Number of People/Workers',
        required: true,
        type: 'number',
        description: 'How many workers they need'
      },
      [PricingCombination.SERVICE_PER_MINUTE_PER_PERSON]: {
        field: 'number_of_people',
        label: 'Number of People/Workers',
        required: true,
        type: 'number',
        description: 'How many workers they need'
      },
      [PricingCombination.TRAVEL_PER_KM_PER_PERSON]: {
        field: 'number_of_people',
        label: 'Number of People/Workers',
        required: true,
        type: 'number',
        description: 'How many workers they need'
      },
      [PricingCombination.TRAVEL_PER_MINUTE_PER_PERSON]: {
        field: 'number_of_people',
        label: 'Number of People/Workers',
        required: true,
        type: 'number',
        description: 'How many workers they need'
      },
      [PricingCombination.LABOR_PER_HOUR_PER_ROOM]: {
        field: 'number_of_rooms',
        label: 'Number of Rooms',
        required: true,
        type: 'number',
        description: 'How many rooms need service'
      },
      [PricingCombination.SERVICE_PER_ROOM]: {
        field: 'number_of_rooms',
        label: 'Number of Rooms',
        required: true,
        type: 'number',
        description: 'How many rooms need service'
      },
      [PricingCombination.SERVICE_PER_SQM]: {
        field: 'square_meters',
        label: 'Square Meters',
        required: true,
        type: 'number',
        description: 'Area size in square meters'
      },
      [PricingCombination.TRAVEL_PER_KM_PER_VEHICLE]: {
        field: 'number_of_vehicles',
        label: 'Number of Vehicles',
        required: true,
        type: 'number',
        description: 'How many vehicles needed'
      },
      [PricingCombination.TRAVEL_PER_MINUTE_PER_VEHICLE]: {
        field: 'number_of_vehicles',
        label: 'Number of Vehicles',
        required: true,
        type: 'number',
        description: 'How many vehicles needed'
      },
      // Fixed pricing combinations don't need quantity
      [PricingCombination.SERVICE_FIXED_PER_SERVICE]: null,
      [PricingCombination.TRAVEL_PER_KM]: null,
      [PricingCombination.TRAVEL_PER_MINUTE]: null,
      [PricingCombination.LABOUR_PER_HOUR]: null,
      [PricingCombination.LABOUR_PER_MINUTE]: null
    };

    return quantityMap[pricingCombination] || null;
  }

  /**
   * Get travel requirements based on charging model
   */
  private getTravelRequirements(travelModel: TravelChargingModel): QuoteRequirement[] {
    const requirementMap: Record<TravelChargingModel, QuoteRequirement[]> = {
      [TravelChargingModel.BETWEEN_CUSTOMER_LOCATIONS]: [
        {
          field: 'pickup_address',
          label: 'Pickup Address',
          required: true,
          type: 'address',
          description: 'Where to pick up from'
        },
        {
          field: 'dropoff_address',
          label: 'Dropoff Address',
          required: true,
          type: 'address',
          description: 'Where to deliver to'
        }
      ],
      [TravelChargingModel.FROM_BASE_TO_CUSTOMERS]: [
        {
          field: 'customer_addresses',
          label: 'Customer Addresses',
          required: true,
          type: 'array',
          description: 'All customer locations (we have our base address)'
        }
      ],
      [TravelChargingModel.FROM_BASE_AND_BETWEEN_CUSTOMERS]: [
        {
          field: 'customer_addresses',
          label: 'Customer Addresses',
          required: true,
          type: 'array',
          description: 'All customer locations (we have our base address)'
        }
      ],
      [TravelChargingModel.FULL_ROUTE]: [
        {
          field: 'customer_addresses',
          label: 'Customer Addresses',
          required: true,
          type: 'array',
          description: 'All customer locations (we handle travel from/to our base)'
        }
      ],
      [TravelChargingModel.CUSTOMERS_AND_BACK_TO_BASE]: [
        {
          field: 'customer_addresses',
          label: 'Customer Addresses',
          required: true,
          type: 'array',
          description: 'All customer locations (we handle travel from/to our base)'
        }
      ],
      [TravelChargingModel.BETWEEN_CUSTOMERS_AND_BACK_TO_BASE]: [
        {
          field: 'customer_addresses',
          label: 'Customer Addresses',
          required: true,
          type: 'array',
          description: 'All customer locations (we handle travel from/to our base)'
        }
      ]
    };

    return requirementMap[travelModel] || [
      {
        field: 'service_address',
        label: 'Service Address',
        required: true,
        type: 'address',
        description: 'Where the service will be performed'
      }
    ];
  }

  /**
   * Merge multiple requirement sets with deduplication
   */
  private mergeRequirements(allRequirements: QuoteRequirements[]): QuoteRequirements {
    const merged: QuoteRequirements = {
      basic: [],
      addresses: [],
      optional: []
    };

    const seenFields = new Set<string>();

    // Merge basic requirements
    allRequirements.forEach(req => {
      req.basic.forEach(basicReq => {
        if (!seenFields.has(basicReq.field)) {
          seenFields.add(basicReq.field);
          merged.basic.push(basicReq);
        }
      });
    });

    // Merge address requirements
    allRequirements.forEach(req => {
      req.addresses.forEach(addrReq => {
        if (!seenFields.has(addrReq.field)) {
          seenFields.add(addrReq.field);
          merged.addresses.push(addrReq);
        }
      });
    });

    // Replace single service_id with service selection for multi-service
    merged.basic = merged.basic.filter(req => req.field !== 'service_id');
    merged.basic.unshift({
      field: 'selected_services',
      label: 'Services Needed',
      required: true,
      type: 'array',
      description: 'Which services do you want? (can be multiple)'
    });

    return merged;
  }

  /**
   * Remove duplicate requirements by field name
   */
  private deduplicateRequirements(requirements: QuoteRequirement[]): QuoteRequirement[] {
    const seen = new Set<string>();
    return requirements.filter(req => {
      if (seen.has(req.field)) {
        return false;
      }
      seen.add(req.field);
      return true;
    });
  }

  /**
   * Map internal types to JSON Schema types
   */
  private mapTypeToJsonSchema(type: string): string {
    switch (type) {
      case 'number': return 'integer';
      case 'array': return 'array';
      default: return 'string';
    }
  }

  /**
   * Get user-friendly question for address fields
   */
  private getAddressQuestion(field: string): string {
    const questionMap: Record<string, string> = {
      pickup_address: "Where do you need us to pick up from?",
      dropoff_address: "And where are we taking it to?",
      service_address: "What's the address where you need the service?",
      customer_addresses: "What addresses do you need us to service?"
    };

    return questionMap[field] || "What's the address?";
  }

  /**
   * Get user-friendly question for basic fields
   */
  private getBasicQuestion(field: string): string {
    const questionMap: Record<string, string> = {
      number_of_people: "How many workers would you like? (We recommend 2 for most jobs)",
      number_of_rooms: "How many rooms need service?",
      square_meters: "What's the approximate size in square meters?",
      number_of_vehicles: "How many vehicles do you think you'll need?",
      preferred_datetime: "When would you like us to get this sorted for you?",
      job_scope: "What type of job is this? (e.g., 'one item', 'few items', 'house move 1-bedroom', etc.)"
    };

    return questionMap[field] || "";
  }
}
