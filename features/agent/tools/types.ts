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



// Function execution
export interface FunctionCallResult {
  success: boolean;
  data?: Record<string, string | number | boolean | object> | string | number | boolean;
  error?: string;
  message?: string;
}

// Tool schema generation (OpenAI Realtime API format)
export interface ToolSchema {
  type: "function";
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: { type: string };
      minimum?: number;
    }>;
    required: string[];
    additionalProperties: false;
  };
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
  service_name?: string;
  service_names?: string[];
  quantity?: number;
  job_scope?: string;
  pickup_address?: string;
  pickup_addresses?: string[];  // Plural array (new schema format)
  dropoff_address?: string;
  dropoff_addresses?: string[]; // Plural array (new schema format)
  service_address?: string;
  customer_addresses?: string[];
  preferred_datetime?: string;
  special_requirements?: string;
  number_of_people?: number;
  number_of_rooms?: number;
  square_meters?: number;
  number_of_vehicles?: number;
}

// Service selection arguments
export interface ServiceSelectionFunctionArgs {
  service_name: string;
}

// Tool configuration
export interface ToolConfig {
  enableEscalation: boolean;
  enableBooking: boolean;
  customSchemas?: ToolSchema[];
}
