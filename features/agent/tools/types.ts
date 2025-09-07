/**
 * AI Agent Tool Types
 *
 * Tool-specific types that extend or compose database types.
 * Database entities are imported from shared/lib/database/types.
 * This file contains ONLY tool-specific compositions and AI-related types.
 */

import type { BusinessContext } from '../../shared/lib/database/types/business-context';
import type { Service, QuoteRequestData, BookingCalculationResult } from '../../scheduling/lib/types/booking-domain';

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

// ============================================================================
// AI FUNCTION ARGUMENTS - Proper AI tool types
// ============================================================================

// Use domain types directly
export type QuoteFunctionArgs = QuoteRequestData;

// AI-specific function argument types
export interface ServiceSelectionFunctionArgs {
  service_name: string;
}

export interface CheckDayAvailabilityFunctionArgs {
  date: string; // YYYY-MM-DD format
}

export interface CreateUserFunctionArgs {
  name: string;
  phone_number: string;
}

export interface CreateBookingFunctionArgs {
  quote_data: BookingCalculationResult & { service_name: string };
  preferred_date: string; // YYYY-MM-DD format
  preferred_time: string; // HH:MM format
  user_id: string;
  confirmation_message?: string;
}

// Tool configuration
export interface ToolConfig {
  enableEscalation: boolean;
  enableBooking: boolean;
  customSchemas?: ToolSchema[];
}
