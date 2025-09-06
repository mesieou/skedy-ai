/**
 * AI Agent Tools
 *
 * Complete tool system for AI function calling
 * - ToolsManager: Main entry point - provides schemas and executes functions
 * - SchemaGenerator: Converts service requirements to OpenAI schemas (used internally)
 */

// Main entry point - use this for AI integration
export { ToolsManager } from './tools-manager';

// Schema management (used internally by ToolsManager)
export { SchemaManager } from './schema-generator';

// User management (reusable across channels)
export { UserCreationService } from './user-creation';

// Scheduling tools
export { QuoteTool } from './scheduling/quote';
export { ServiceSelectionTool } from './scheduling/service-selection';

// All types
export type {
  QuoteRequirement,
  QuoteRequirements,
  FunctionCallResult,
  ToolSchema,
  ToolConfig,
  QuoteContext,
  QuoteFunctionArgs,
  ServiceSelectionFunctionArgs
} from './types';
