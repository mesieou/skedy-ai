import { BaseEntity } from "./base";
import type { OpenAIFunctionSchema, ToolOutputTemplate } from "./tools";

/**
 * Business-specific tool configurations
 */
export interface BusinessTool extends BaseEntity {
  business_id: string;                   // Link to business
  tool_id: string;                       // Link to tool
  active: boolean;                       // Is this tool enabled for the business?

  // Business-specific overrides (stored as JSON)
  schema_overrides?: Partial<OpenAIFunctionSchema> | null;  // Business-specific schema modifications
  output_overrides?: Partial<ToolOutputTemplate> | null;   // Business-specific output templates

  // Dynamic parameters for this business (if tool.dynamic_parameters = true)
  dynamic_schema?: OpenAIFunctionSchema | null;  // Fully generated schema for this business
}

// Create/Update types
export type CreateBusinessToolData = Omit<BusinessTool, 'id' | 'created_at' | 'updated_at'>;
export type UpdateBusinessToolData = Partial<Omit<BusinessTool, 'id' | 'created_at' | 'updated_at'>>;
