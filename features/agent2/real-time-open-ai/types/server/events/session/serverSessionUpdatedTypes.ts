/**
 * OpenAI Realtime API Server Session Updated Types
 * Based exactly on the session.updated server event documentation
 */

import {
  ServerRealtimeSessionConfiguration,
  ServerRealtimeTranscriptionSessionConfiguration
} from './serverSessionCreatedTypes';

// ============================================================================
// SERVER SESSION UPDATED EVENT
// ============================================================================

export interface ServerSessionUpdatedEvent {
  event_id: string;
  session: ServerRealtimeSessionConfiguration | ServerRealtimeTranscriptionSessionConfiguration;
  type: string;
}
