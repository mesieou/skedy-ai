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

// Scheduling tools (Agent Layer - Thin Orchestrators)
export { QuoteTool } from './scheduling/quote';
export { ServiceSelectionTool } from './scheduling/service-selection';
export { UserManagementTool } from './scheduling/user-management';
export { BookingManagementTool } from './scheduling/booking-management';
export { AvailabilityCheckTool } from './scheduling/availability-check';

// Domain services (can be imported directly for non-AI use cases)
export { BookingOrchestrator } from '../../scheduling/lib/bookings/booking-orchestrator';
export { QuoteInputTransformer } from '../../scheduling/lib/bookings/quote-input-transformer';
export { ServiceSelector } from '../../scheduling/lib/bookings/service-selector';
export { CustomerManager } from '../../scheduling/lib/bookings/customer-manager';

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
