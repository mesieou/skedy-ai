/**
 * OpenAI Realtime API Response Cancel Types
 * Based exactly on the response.cancel event documentation
 */

// ============================================================================
// RESPONSE CANCEL EVENT
// ============================================================================

export interface ResponseCancelEvent {
  event_id?: string;
  response_id?: string;
  type: string;
}
