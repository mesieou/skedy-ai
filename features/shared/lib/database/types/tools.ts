import { BaseEntity } from "./base";

/**
 * Tool Catalog - All available tools
 */
export interface Tool extends BaseEntity {
  name: string;                         // Tool name, e.g., "CreateBooking"
  description?: string | null;          // Short description of what the tool does
  optional_parameters?: Record<string, string> | null;  // Optional fields: {"field": "type"}
  required_parameters?: Record<string, string> | null;  // Required fields: {"field": "type"}
  dynamic_parameters: boolean;          // If true, parameters generated dynamically per business
  output_message?: string | null;       // Template message for AI response
  output_data?: Record<string, unknown> | null;  // Template for structured output
  version: string;                      // Semantic versioning (default: "1.0.0")
}

/**
 * Business-specific tool configurations
 */
export interface BusinessTool extends BaseEntity {
  business_id: string;                  // Link to business
  tool_id: string;                      // Link to tool catalog
  active: boolean;                      // Is this tool enabled for the business?
  optional_parameters?: Record<string, string> | null;  // Business-specific optional fields (extends base)
  required_parameters?: Record<string, string> | null;  // Business-specific required fields (extends base)
}

// Create/Update types
export type CreateToolData = Omit<Tool, 'id' | 'created_at' | 'updated_at'>;
export type UpdateToolData = Partial<Omit<Tool, 'id' | 'created_at' | 'updated_at'>>;

export type CreateBusinessToolData = Omit<BusinessTool, 'id' | 'created_at' | 'updated_at'>;
export type UpdateBusinessToolData = Partial<Omit<BusinessTool, 'id' | 'created_at' | 'updated_at'>>;

// Helper types for tool execution
export interface ToolParameters {
  optional: Record<string, string>;
  required: Record<string, string>;
}

export interface ToolExecution {
  toolId: string;
  businessId: string;
  parameters: ToolParameters;
  isDynamic: boolean;
}
