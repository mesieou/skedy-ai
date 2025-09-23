/**
 * OpenAI Realtime API Server Rate Limits Updated Types
 * Based exactly on the rate_limits.updated server event documentation
 */

// ============================================================================
// RATE LIMIT INFORMATION
// ============================================================================

export interface RateLimit {
  limit: number;
  name: string;
  remaining: number;
  reset_seconds: number;
}

// ============================================================================
// SERVER RATE LIMITS UPDATED EVENT
// ============================================================================

export interface ServerRateLimitsUpdatedEvent {
  event_id: string;
  rate_limits: RateLimit[];
  type: string;
}
