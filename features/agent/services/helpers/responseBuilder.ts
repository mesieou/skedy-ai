/**
 * Clean, simple, scalable tool response builder
 * No templates, no complex logic - just consistent responses
 */
export function buildToolResponse(
  data: Record<string, unknown> | null,
  message: string,
  isSuccess: boolean = true
): Record<string, unknown> {
  return {
    success: isSuccess,
    message: message,
    ...(data || {})
  };
}
