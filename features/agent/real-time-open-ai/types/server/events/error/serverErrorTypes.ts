/**
 * OpenAI Realtime API Server Error Types
 * Based exactly on the server error event documentation
 */

// ============================================================================
// SERVER ERROR EVENT
// ============================================================================

export interface ErrorDetails {
  message: string;
  type: string;
  code?: string;
  event_id?: string;
  param?: string;
}

export interface ServerErrorEvent {
  error: ErrorDetails;
  event_id: string;
  type: string;
}
