/**
 * AI Agent Tools
 *
 * Simplified, scalable tool system with unified types and clean architecture
 * Supports dynamic quote requirements for multiple business types
 */

// Core classes
export { AITools } from './ai-tools';
export { RequirementsEngine } from './requirements-engine';
export { FunctionExecutor } from './function-executor';
export { AdaptiveQuoteTool } from './adaptive-quote-tool';

// All types from unified types file
export type {
  QuoteRequirement,
  QuoteRequirements,
  QuoteSession,
  FunctionCallResult,
  ToolSchema,
  ToolConfig,
  MultiServiceQuoteInput,
  QuoteContext,
  QuoteFunctionArgs
} from './types';

// Legacy exports for backward compatibility (deprecated)
/** @deprecated Use RequirementsEngine instead */
export { RequirementsEngine as QuoteRequirementsAnalyzer } from './requirements-engine';
