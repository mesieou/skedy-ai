/**
 * OpenAI Realtime API Server Response Done Types
 * Based exactly on the response.done server event documentation
 */

import { ResponseResource } from './serverResponseCreatedTypes';

// ============================================================================
// SERVER RESPONSE DONE EVENT
// ============================================================================

export interface ServerResponseDoneEvent {
  event_id: string;
  response: ResponseResource;
  type: string;
}
