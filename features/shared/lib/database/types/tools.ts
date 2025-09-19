import { BaseEntity } from "./base";

/**
 * Tool Definition
 * Combines database storage with OpenAI function calling schema
 */
export interface Tool extends BaseEntity {
  // Basic tool metadata (for database storage)
  name: string;                           // Tool name, e.g., "get_quote"
  description: string;                    // Description for OpenAI and humans
  version: string;                        // Semantic versioning (default: "1.0.0")

  // OpenAI Function Schema (stored as JSON in database)
  function_schema: OpenAIFunctionSchema;  // Complete OpenAI function definition

  // Tool behavior configuration
  dynamic_parameters: boolean;            // If true, schema generated dynamically per business
  output_template?: ToolOutputTemplate | null;  // Template for standardized responses

  // Business relationship
  business_specific: boolean;             // If true, requires business-specific configuration
}

/**
 * OpenAI Function Schema - matches OpenAI's expected format
 */
export interface OpenAIFunctionSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    strict?: boolean;
    parameters: {
      type: "object";
      description?: string;
      properties: Record<string, ParameterDefinition>;
      required?: string[];
      additionalProperties?: boolean;
    };
  };
}

/**
 * Parameter Definition for OpenAI schema
 */
export interface ParameterDefinition {
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
  enum?: string[];
  properties?: Record<string, ParameterDefinition>;  // For nested objects
  items?: ParameterDefinition | ParameterDefinition[];  // For arrays
  required?: string[];  // For nested objects
  additionalProperties?: boolean;
  default?: unknown;
  examples?: unknown[];
}

/**
 * Template for tool output formatting
 */
export interface ToolOutputTemplate {
  success_message?: string;              // Template for success responses
  error_message?: string;                // Template for error responses
  data_structure?: Record<string, string>;  // Expected data structure (field name -> type description)
}


/**
 * Runtime Tool Result (for function execution)
 */
export interface ToolResult<T extends object = object> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * Tool Execution Context
 */
export interface ToolExecutionContext {
  toolId: string;
  businessId: string;
  callId?: string;
  userId?: string;
}

// Create/Update types
export type CreateToolData = Omit<Tool, 'id' | 'created_at' | 'updated_at'>;
export type UpdateToolData = Partial<Omit<Tool, 'id' | 'created_at' | 'updated_at'>>;


// Helper type guards
export function hasBusinessConfig(tool: Tool): boolean {
  return tool.business_specific;
}

export function isDynamicTool(tool: Tool): boolean {
  return tool.dynamic_parameters;
}
