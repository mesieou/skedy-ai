import { VoiceRedisClient } from './redisClient';
import type { Session } from './session';
import { sentry } from '@/features/shared/utils/sentryService';
import assert from 'assert';

// Create Redis client instance for sessions
const redisClient = new VoiceRedisClient();

/**
 * Redis Session Manager with Hash-based Partial Updates
 *
 * Uses Redis hashes for efficient field-level updates:
 * - Only updates changed fields, not entire session
 * - Reduces network overhead and serialization cost
 * - Supports field-specific operations
 */
export class RedisSessionManager {
  private readonly KEY_PREFIX = 'agent2:session:';
  private readonly TTL_SECONDS = 3600; // 1 hour session TTL

  /**
   * Save complete session to Redis as hash fields
   */
  async saveSession(session: Session): Promise<void> {
    try {
      const key = this.getSessionKey(session);
      const hashFields = this.sessionToHashFields(session);

      // Use pipeline for atomic multi-field update
      const pipeline = redisClient.client.pipeline();
      for (const [field, value] of Object.entries(hashFields)) {
        pipeline.hset(key, field, value);
      }
      pipeline.expire(key, this.TTL_SECONDS);
      await pipeline.exec();
    } catch (error) {
      console.error(`❌ [RedisSessionManager] Failed to save session ${session.id}:`, error);

      // Track error in Sentry
      sentry.trackError(error as Error, {
        sessionId: session.id,
        businessId: session.businessId,
        operation: 'redis_save_session',
        metadata: {
          sessionStatus: session.status,
          interactionsCount: session.interactions.length
        }
      });

      // Don't throw - let app continue with memory-only session
    }
  }

  /**
   * Load session from Redis hash fields
   */
  async loadSession(sessionId: string, businessId: string): Promise<Session | null> {
    try {
      const key = this.getBusinessSessionKey(businessId, sessionId);
      const hashData = await redisClient.hgetall(key);

      if (!hashData || Object.keys(hashData).length === 0) {
        return null;
      }

      return this.hashFieldsToSession(hashData);
    } catch (error) {
      console.error(`❌ [RedisSessionManager] Failed to load session ${sessionId}:`, error);

      // Track error in Sentry
      sentry.trackError(error as Error, {
        sessionId: sessionId,
        businessId: businessId,
        operation: 'redis_load_session',
        metadata: {
          key: this.getBusinessSessionKey(businessId, sessionId)
        }
      });

      return null;
    }
  }

  /**
   * Delete session from Redis
   */
  async deleteSession(sessionId: string, businessId: string): Promise<void> {
    try {
      const key = this.getBusinessSessionKey(businessId, sessionId);
      await redisClient.del(key);
    } catch (error) {
      console.error(`❌ [RedisSessionManager] Failed to delete session ${sessionId}:`, error);

      // Track error in Sentry
      sentry.trackError(error as Error, {
        sessionId: sessionId,
        businessId: businessId,
        operation: 'redis_delete_session',
        metadata: {
          key: this.getBusinessSessionKey(businessId, sessionId)
        }
      });

      // Don't throw - session cleanup is not critical
    }
  }

  /**
   * Check if session exists in Redis
   */
  async sessionExists(sessionId: string, businessId: string): Promise<boolean> {
    try {
      const key = this.getBusinessSessionKey(businessId, sessionId);
      const exists = await redisClient.exists(key);
      return exists === 1;
    } catch (error) {
      console.error(`❌ [RedisSessionManager] Failed to check session existence ${sessionId}:`, error);

      // Track error in Sentry
      sentry.trackError(error as Error, {
        sessionId: sessionId,
        businessId: businessId,
        operation: 'redis_session_exists',
        metadata: {
          key: this.getBusinessSessionKey(businessId, sessionId)
        }
      });

      return false;
    }
  }

  /**
   * Update specific session field (efficient partial update) with validation
   */
  async updateSessionField(sessionId: string, businessId: string, field: string, value: unknown): Promise<void> {
    assert(sessionId && businessId && field, 'updateSessionField: sessionId, businessId, and field are required');

    try {
      const key = this.getBusinessSessionKey(businessId, sessionId);
      const serializedValue = this.serializeFieldValue(value);
      await redisClient.hset(key, field, serializedValue);
    } catch (error) {
      console.error(`❌ [RedisSessionManager] Failed to update field ${field} for session ${sessionId}:`, error);
      throw error; // Re-throw to allow caller to handle
    }
  }

  /**
   * Update multiple session fields atomically with validation
   */
  async updateSessionFields(sessionId: string, businessId: string, fields: Record<string, unknown>): Promise<void> {
    assert(sessionId && businessId && fields && Object.keys(fields).length > 0, 'updateSessionFields: sessionId, businessId, and non-empty fields are required');

    try {
      const key = this.getBusinessSessionKey(businessId, sessionId);
      const pipeline = redisClient.client.pipeline();

      for (const [field, value] of Object.entries(fields)) {
        if (!field) {
          console.warn(`⚠️ [RedisSessionManager] Skipping empty field name for session ${sessionId}`);
          continue;
        }
        const serializedValue = this.serializeFieldValue(value);
        pipeline.hset(key, field, serializedValue);
      }

      const results = await pipeline.exec();

      // Check for pipeline errors
      if (results) {
        const errors = results.filter(([error]) => error !== null);
        assert(errors.length === 0, `Pipeline errors detected: ${errors.map(([error]) => error?.message).join(', ')}`);
      }
    } catch (error) {
      console.error(`❌ [RedisSessionManager] Failed to update fields for session ${sessionId}:`, error);
      throw error; // Re-throw to allow caller to handle
    }
  }

  /**
   * Extend session TTL (useful for active sessions)
   */
  async extendSessionTTL(sessionId: string, businessId: string, ttlSeconds: number = this.TTL_SECONDS): Promise<void> {
    try {
      const key = this.getBusinessSessionKey(businessId, sessionId);
      await redisClient.expire(key, ttlSeconds);
    } catch (error) {
      console.error(`❌ [RedisSessionManager] Failed to extend TTL for session ${sessionId}:`, error);

      // Track error in Sentry
      sentry.trackError(error as Error, {
        sessionId: sessionId,
        businessId: businessId,
        operation: 'redis_extend_ttl',
        metadata: {
          ttlSeconds: ttlSeconds,
          key: this.getBusinessSessionKey(businessId, sessionId)
        }
      });
    }
  }

  /**
   * Get business-namespaced session key (preferred)
   */
  private getSessionKey(session: Session): string {
    return `agent2:business:${session.businessId}:session:${session.id}`;
  }

  /**
   * Get business-namespaced session key by IDs
   */
  private getBusinessSessionKey(businessId: string, sessionId: string): string {
    return `agent2:business:${businessId}:session:${sessionId}`;
  }

  /**
   * Convert session object to Redis hash fields with error handling
   */
  private sessionToHashFields(session: Session): Record<string, string> {
    const safeStringify = (obj: unknown, fallback: string = 'null'): string => {
      try {
        return JSON.stringify(obj);
      } catch (error) {
        console.error(`❌ [RedisSessionManager] Failed to serialize object for session ${session.id}:`, error);

        // Track serialization error in Sentry
        sentry.trackError(error as Error, {
          sessionId: session.id,
          businessId: session.businessId,
          operation: 'redis_serialize_object',
          metadata: {
            objectType: typeof obj,
            fallbackUsed: fallback
          }
        });

        return fallback;
      }
    };

    return {
      // Core session data (using native Redis types where possible)
      id: session.id,
      businessId: session.businessId,
      customerPhoneNumber: session.customerPhoneNumber,
      customerId: session.customerId || '',
      status: session.status,
      channel: session.channel,
      startedAt: session.startedAt.toString(),
      endedAt: session.endedAt?.toString() || '',
      durationInMinutes: session.durationInMinutes?.toString() || '',
      eventType: (session as Session & { eventType?: string }).eventType || '',

      // Complex objects as JSON strings with error handling
      businessEntity: safeStringify(session.businessEntity, '{}'),
      customerEntity: safeStringify(session.customerEntity || null),
      interactions: safeStringify(session.interactions, '[]'),
      tokenUsage: safeStringify(session.tokenUsage, '{}'),

      // Tool system fields
      serviceNames: safeStringify(session.serviceNames, '[]'),
      quotes: safeStringify(session.quotes, '[]'),
      selectedQuote: safeStringify(session.selectedQuote || null),
      selectedQuoteRequest: safeStringify(session.selectedQuoteRequest || null),
      allAvailableToolNames: safeStringify(session.allAvailableToolNames, '[]'),
      currentTools: safeStringify(session.currentTools, '[]'),
      aiInstructions: session.aiInstructions || ''
    };
  }

  /**
   * Convert Redis hash fields back to session object with validation and error handling
   */
  private hashFieldsToSession(hashData: Record<string, string>): Session {
    const safeParse = <T>(jsonString: string, fallback: T, fieldName: string): T => {
      try {
        if (!jsonString || jsonString === 'null') {
          return fallback;
        }
        return JSON.parse(jsonString) as T;
      } catch (error) {
        console.error(`❌ [RedisSessionManager] Failed to parse ${fieldName}, using fallback:`, error);

        // Track parsing error in Sentry
        sentry.trackError(error as Error, {
          sessionId: 'unknown', // We don't have session context here
          businessId: 'unknown',
          operation: 'redis_parse_field',
          metadata: {
            fieldName: fieldName,
            jsonString: jsonString?.substring(0, 100), // First 100 chars for debugging
            fallbackType: typeof fallback
          }
        });

        return fallback;
      }
    };

    // Validate required fields
    assert(hashData.id && hashData.businessId, `Invalid session data: missing required fields (id: ${hashData.id}, businessId: ${hashData.businessId})`);

    return {
      // Core session data with validation
      id: hashData.id,
      businessId: hashData.businessId,
      customerPhoneNumber: hashData.customerPhoneNumber || '',
      customerId: hashData.customerId || undefined,
      status: (hashData.status as 'active' | 'ended') || 'active',
      channel: (hashData.channel as 'phone' | 'whatsapp' | 'website') || 'phone',
      startedAt: parseInt(hashData.startedAt) || Date.now(),
      endedAt: hashData.endedAt ? parseInt(hashData.endedAt) : undefined,
      durationInMinutes: hashData.durationInMinutes ? parseInt(hashData.durationInMinutes) : undefined,

      // Complex objects from JSON strings with error handling
      businessEntity: safeParse(hashData.businessEntity, {} as Session['businessEntity'], 'businessEntity'),
      customerEntity: safeParse(hashData.customerEntity, undefined, 'customerEntity'),
      interactions: safeParse(hashData.interactions, [], 'interactions'),
      tokenUsage: safeParse(hashData.tokenUsage, {} as Session['tokenUsage'], 'tokenUsage'),

      // Tool system fields
      serviceNames: safeParse(hashData.serviceNames, [], 'serviceNames'),
      quotes: safeParse(hashData.quotes, [], 'quotes'),
      selectedQuote: safeParse(hashData.selectedQuote, undefined, 'selectedQuote'),
      selectedQuoteRequest: safeParse(hashData.selectedQuoteRequest, undefined, 'selectedQuoteRequest'),
      allAvailableToolNames: safeParse(hashData.allAvailableToolNames, [], 'allAvailableToolNames'),
      currentTools: safeParse(hashData.currentTools, [], 'currentTools'),
      aiInstructions: hashData.aiInstructions || undefined,

      // Interaction tracking initialization - required field
      isFirstAiResponse: true,
      assignedApiKeyIndex: parseInt(hashData.assignedApiKeyIndex) || 0
    } as Session;
  }

  /**
   * Serialize field value for Redis storage with error handling
   */
  private serializeFieldValue(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'boolean') {
      return value.toString();
    }
    if (value === null || value === undefined) {
      return 'null';
    }

    try {
      return JSON.stringify(value);
    } catch (error) {
      console.error(`❌ [RedisSessionManager] Failed to serialize field value:`, error);

      // Track serialization error in Sentry
      sentry.trackError(error as Error, {
        sessionId: 'unknown', // We don't have session context here
        businessId: 'unknown',
        operation: 'redis_serialize_field_value',
        metadata: {
          valueType: typeof value,
          valueConstructor: value?.constructor?.name
        }
      });

      return 'null';
    }
  }

}

// Singleton instance
export const redisSessionManager = new RedisSessionManager();
