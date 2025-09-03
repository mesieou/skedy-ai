/**
 * Unified Types for AI Agent Tools
 *
 * Consolidates all tool-related types for better maintainability
 * and type safety across the agent system
 */

import type { BusinessContext } from '../../shared/lib/database/types/business-context';
import type { Service } from '../../shared/lib/database/types/service';

// Core requirement types
export interface QuoteRequirement {
  field: string;
  label: string;
  required: boolean;
  type: 'address' | 'number' | 'datetime' | 'text' | 'array';
  description: string;
  enum?: string[];
}

export interface QuoteRequirements {
  basic: QuoteRequirement[];
  addresses: QuoteRequirement[];
  optional: QuoteRequirement[];
}

// Session management
export interface QuoteSession {
  serviceIds: string[];
  collectedInfo: Record<string, string | number | boolean | string[]>;
  missingRequirements: string[];
  nextQuestion?: string;
  isMultiService: boolean;
  currentStep: 'service_selection' | 'info_collection' | 'quote_generation' | 'booking_confirmation';
}

// Function execution
export interface FunctionCallResult {
  success: boolean;
  data?: Record<string, string | number | boolean | object> | string | number | boolean;
  error?: string;
  message?: string;
}

// Tool schema generation
export interface ToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    strict: true;
    parameters: {
      type: "object";
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
        items?: { type: string };
      }>;
      required: string[];
      additionalProperties: false;
    };
  };
}

// Multi-service support
export interface MultiServiceQuoteInput {
  serviceIds: string[];
  isSimultaneous: boolean;
  customerAddresses?: string[];
  specialRequirements?: string;
}

// Quote generation context
export interface QuoteContext {
  service: Service;
  businessInfo: BusinessContext['businessInfo'];
  requirements: QuoteRequirements;
  collectedInfo: Record<string, string | number | boolean | string[]>;
}

// Function arguments (unified interface for all functions)
export interface QuoteFunctionArgs {
  service_id?: string;
  service_ids?: string[];
  quantity?: number;
  job_scope?: string;
  pickup_address?: string;
  dropoff_address?: string;
  service_address?: string;
  customer_addresses?: string[];
  preferred_datetime?: string;
  special_requirements?: string;
  number_of_people?: number;
  number_of_rooms?: number;
  square_meters?: number;
  number_of_vehicles?: number;
}

// Tool configuration
export interface ToolConfig {
  enableMultiService: boolean;
  enableEscalation: boolean;
  enableBooking: boolean;
  customSchemas?: ToolSchema[];
}
