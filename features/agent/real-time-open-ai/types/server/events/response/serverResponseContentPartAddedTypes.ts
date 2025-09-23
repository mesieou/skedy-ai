/**
 * OpenAI Realtime API Server Response Content Part Added Types
 * Based exactly on the response.content_part.added server event documentation
 */

// ============================================================================
// CONTENT PART TYPES
// ============================================================================

export interface ContentPart {
  audio?: string;
  text?: string;
  transcript?: string;
  type: string;
}

// ============================================================================
// SERVER RESPONSE CONTENT PART ADDED EVENT
// ============================================================================

export interface ServerResponseContentPartAddedEvent {
  content_index: number;
  event_id: string;
  item_id: string;
  output_index: number;
  part: ContentPart;
  response_id: string;
  type: string;
}
