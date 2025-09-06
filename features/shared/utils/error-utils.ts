/**
 * Shared Error Utilities
 *
 * Common error handling patterns for agent tools to avoid duplication
 */

import type { FunctionCallResult } from '../types';

/**
 * Create standardized error result for tool functions
 */
export function createToolError(error: string, message: string): FunctionCallResult {
  return {
    success: false,
    error,
    message
  };
}

/**
 * Create standardized success result for tool functions
 */
export function createToolSuccess(message: string, data?: Record<string, unknown>): FunctionCallResult {
  return {
    success: true,
    message,
    ...(data && { data })
  };
}

/**
 * Wrap async tool operations with standardized error handling
 */
export async function executeToolOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string = "Operation failed"
): Promise<FunctionCallResult> {
  try {
    const result = await operation();
    return createToolSuccess("Operation completed successfully", result as Record<string, unknown>);
  } catch (error) {
    const errorDetails = error instanceof Error ? error.message : 'Unknown error';
    return createToolError(errorDetails, errorMessage);
  }
}
