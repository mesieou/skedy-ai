/**
 * OpenAI Realtime API Server Response Function Call Arguments Delta Types
 * Based exactly on the response.function_call_arguments.delta server event documentation
 */

// ============================================================================
// SERVER RESPONSE FUNCTION CALL ARGUMENTS DELTA EVENT
// ============================================================================

export interface ServerResponseFunctionCallArgumentsDeltaEvent {
  call_id: string;
  delta: string;
  event_id: string;
  item_id: string;
  output_index: number;
  response_id: string;
  type: string;
}
