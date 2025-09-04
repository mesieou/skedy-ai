/**
 * AI Agent Tools
 *
 * Simplified, scalable tool system with unified types and clean architecture
 * Supports dynamic quote requirements for multiple business types
 */

export { ToolsManager } from './tools-manager';

// Scheduling tools
export { QuoteTool } from './scheduling/quote';

// All types
export type {
  QuoteRequirement,
  QuoteRequirements,
  FunctionCallResult,
  ToolSchema,
  ToolConfig,
  QuoteContext,
  QuoteFunctionArgs
} from './types';
