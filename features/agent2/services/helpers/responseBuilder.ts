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

  // Build the data response
  const dataResponse = Object.keys(template).reduce((response, key) => {
    response[key] = data
      ? (key.endsWith('_id') ? data.id : data[key] || null)
      : (key === 'description' ? errorMessage : null);
    return response;
  }, {} as Record<string, unknown>);

  // Add success/error message
  let message = '';
  if (data && tool.output_template?.success_message) {
    // Substitute variables in success message using data
    // Support both ${variable} and {variable} patterns
    message = tool.output_template.success_message
      .replace(/\${(\w+)}/g, (match, key) => {
        return data[key] !== undefined ? String(data[key]) : match;
      })
      .replace(/{(\w+)}/g, (match, key) => {
        return data[key] !== undefined ? String(data[key]) : match;
      });
  } else if (errorMessage) {
    // Use specific error message if provided, otherwise fall back to template
    message = errorMessage;
  }

  return {
    ...dataResponse,
    ...(message && { message })
  };
}
