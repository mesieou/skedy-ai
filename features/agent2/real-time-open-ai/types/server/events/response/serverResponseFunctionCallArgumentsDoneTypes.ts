/**
 * OpenAI Realtime API Server Response Function Call Arguments Done Types
 * Based exactly on the response.function_call_arguments.done server event documentation
 */

// ============================================================================
// SERVER RESPONSE FUNCTION CALL ARGUMENTS DONE EVENT
// ============================================================================

export interface ServerResponseFunctionCallArgumentsDoneEvent {
  arguments: string;
  call_id: string;
  event_id: string;
  item_id: string;
  name: string;
  output_index: number;
  response_id: string;
  type: string;
}
