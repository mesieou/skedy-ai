import type { Tool } from '../../../shared/lib/database/types/tools';

/**
 * Simple, elegant, dynamic response builder for all tools
 */
export function buildToolResponse<T extends Record<string, unknown> = Record<string, unknown>>(
  tool: Tool,
  data: T | null = null,
  errorMessage?: string
): Record<string, unknown> {
  const template = tool.output_template?.data_structure || {};

  return Object.keys(template).reduce((response, key) => {
    response[key] = data
      ? (key.endsWith('_id') ? data.id : data[key] || null)
      : (key === 'description' ? errorMessage : null);
    return response;
  }, {} as Record<string, unknown>);
}
