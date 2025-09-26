/**
 * Voice Redis Client
 *
 * Production-ready Redis client for voice agent with:
 * - Session storage with hash-based operations
 * - Simple key-value storage for demo data
 * - Single Redis connection for efficiency
 * - Essential error handling and monitoring
 */

import Redis from 'ioredis';
import { sentry } from '@/features/shared/utils/sentryService';
import type { Session } from './session';
import assert from 'assert';

interface VoiceRedisConfig {
  host: string;
  port: number;
  db: number;
  password?: string;
  maxRetriesPerRequest: number;
  enableOfflineQueue: boolean;
}

export class VoiceRedisClient {
  public readonly client: Redis;
  private config: VoiceRedisConfig;
  private isConnecting = false;
  private isConnected = false;

  // Session management constants
  private readonly SESSION_TTL_SECONDS = 3600; // 1 hour

  constructor() {
    this.config = this.getRedisConfig();
    this.client = this.createRedisConnection();
    this.setupEventHandlers();
  }

  private getRedisConfig(): VoiceRedisConfig {
    return {
      host: process.env.VOICE_REDIS_HOST || 'localhost',
      port: parseInt(process.env.VOICE_REDIS_PORT || '6379'),
      db: parseInt(process.env.VOICE_REDIS_DB || '0'),
      password: process.env.VOICE_REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false
    };
  }

  private createRedisConnection(): Redis {
    return new Redis({
      host: this.config.host,
      port: this.config.port,
      db: this.config.db,
      password: this.config.password,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      enableOfflineQueue: this.config.enableOfflineQueue,
      lazyConnect: true,
      connectionName: 'voice_unified',
      keepAlive: 30000,
      family: 4, // IPv4
    });
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('🔗 [Redis] Connected to Redis server');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.isConnecting = false;
      console.log('✅ [Redis] Redis client ready');
    });

    this.client.on('error', (error: Error) => {
      console.error('❌ [Redis] Client error:', error.message);
      this.isConnecting = false;

      sentry.trackError(error, {
        sessionId: 'redis_client',
        businessId: 'system',
        operation: 'redis_client_error',
        metadata: {
          connectionStatus: this.client.status,
          config: {
            host: this.config.host,
            port: this.config.port,
            db: this.config.db
          }
        }
      });
    });

    this.client.on('close', () => {
      this.isConnected = false;
      this.isConnecting = false;
      console.log('🔌 [Redis] Connection closed');
    });
  }

  // ============================================================================
  // BASIC REDIS OPERATIONS (for demo data, simple storage)
  // ============================================================================

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('❌ [Redis] GET error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    if (ttlSeconds) {
      return await this.client.setex(key, ttlSeconds, value);
    }
    return await this.client.set(key, value);
  }

  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return await this.client.exists(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    return await this.client.expire(key, ttlSeconds);
  }

  // ============================================================================
  // SESSION MANAGEMENT OPERATIONS
  // ============================================================================

  /**
   * Save complete session to Redis as hash fields
   */
  async saveSession(session: Session): Promise<void> {
    try {
      const key = this.getSessionKey(session);
      const hashFields = this.sessionToHashFields(session);

      // Use pipeline for atomic multi-field update
      const pipeline = this.client.pipeline();
      for (const [field, value] of Object.entries(hashFields)) {
        pipeline.hset(key, field, value);
      }
      pipeline.expire(key, this.SESSION_TTL_SECONDS);
      await pipeline.exec();
    } catch (error) {
      console.error(`❌ [Redis] Failed to save session ${session.id}:`, error);

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
      const hashData = await this.client.hgetall(key);

      if (!hashData || Object.keys(hashData).length === 0) {
        return null;
      }

      return this.hashFieldsToSession(hashData);
    } catch (error) {
      console.error(`❌ [Redis] Failed to load session ${sessionId}:`, error);

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
      await this.client.del(key);
    } catch (error) {
      console.error(`❌ [Redis] Failed to delete session ${sessionId}:`, error);

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
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      console.error(`❌ [Redis] Failed to check session existence ${sessionId}:`, error);

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
   * Update specific session field (efficient partial update)
   */
  async updateSessionField(sessionId: string, businessId: string, field: string, value: unknown): Promise<void> {
    assert(sessionId && businessId && field, 'updateSessionField: sessionId, businessId, and field are required');

    try {
      const key = this.getBusinessSessionKey(businessId, sessionId);
      const serializedValue = this.serializeFieldValue(value);
      await this.client.hset(key, field, serializedValue);
    } catch (error) {
      console.error(`❌ [Redis] Failed to update field ${field} for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Update multiple session fields atomically
   */
  async updateSessionFields(sessionId: string, businessId: string, fields: Record<string, unknown>): Promise<void> {
    assert(sessionId && businessId && fields && Object.keys(fields).length > 0, 'updateSessionFields: sessionId, businessId, and non-empty fields are required');

    try {
      const key = this.getBusinessSessionKey(businessId, sessionId);
      const pipeline = this.client.pipeline();

      for (const [field, value] of Object.entries(fields)) {
        if (!field) {
          console.warn(`⚠️ [Redis] Skipping empty field name for session ${sessionId}`);
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
      console.error(`❌ [Redis] Failed to update fields for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Extend session TTL (useful for active sessions)
   */
  async extendSessionTTL(sessionId: string, businessId: string, ttlSeconds: number = this.SESSION_TTL_SECONDS): Promise<void> {
    try {
      const key = this.getBusinessSessionKey(businessId, sessionId);
      await this.client.expire(key, ttlSeconds);
    } catch (error) {
      console.error(`❌ [Redis] Failed to extend TTL for session ${sessionId}:`, error);

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

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  async connect(): Promise<void> {
    try {
      if (this.isConnected || this.isConnecting) {
        return;
      }

      this.isConnecting = true;

      if (this.client.status !== 'ready' && this.client.status !== 'connecting') {
        await this.client.connect();
      }
    } catch (error) {
      this.isConnecting = false;
      console.error('❌ [Redis] Connection failed:', error);

      sentry.trackError(error as Error, {
        sessionId: 'redis_client',
        businessId: 'system',
        operation: 'redis_connection_failed',
        metadata: {
          config: {
            host: this.config.host,
            port: this.config.port,
            db: this.config.db
          },
          clientStatus: this.client.status
        }
      });

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
    this.isConnected = false;
    this.isConnecting = false;
    console.log('🔌 [Redis] Disconnected from Redis server');
  }

  async ping(): Promise<string> {
    return await this.client.ping();
  }

  getConnectionStatus(): {
    status: string;
    isConnected: boolean;
    isConnecting: boolean;
  } {
    return {
      status: this.client.status,
      isConnected: this.isConnected,
      isConnecting: this.isConnecting
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Get business-namespaced session key
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
   * Convert session object to Redis hash fields
   */
  private sessionToHashFields(session: Session): Record<string, string> {
    const safeStringify = (obj: unknown, fallback: string = 'null'): string => {
      try {
        return JSON.stringify(obj);
      } catch (error) {
        console.error(`❌ [Redis] Failed to serialize object for session ${session.id}:`, error);

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
      // Core session data
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

      // Complex objects as JSON strings
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
   * Convert Redis hash fields back to session object
   */
  private hashFieldsToSession(hashData: Record<string, string>): Session {
    const safeParse = <T>(jsonString: string, fallback: T, fieldName: string): T => {
      try {
        if (!jsonString || jsonString === 'null') {
          return fallback;
        }
        return JSON.parse(jsonString) as T;
      } catch (error) {
        console.error(`❌ [Redis] Failed to parse ${fieldName}, using fallback:`, error);

        sentry.trackError(error as Error, {
          sessionId: 'unknown',
          businessId: 'unknown',
          operation: 'redis_parse_field',
          metadata: {
            fieldName: fieldName,
            jsonString: jsonString?.substring(0, 100),
            fallbackType: typeof fallback
          }
        });

        return fallback;
      }
    };

    // Validate required fields
    assert(hashData.id && hashData.businessId, `Invalid session data: missing required fields (id: ${hashData.id}, businessId: ${hashData.businessId})`);

    return {
      // Core session data
      id: hashData.id,
      businessId: hashData.businessId,
      customerPhoneNumber: hashData.customerPhoneNumber || '',
      customerId: hashData.customerId || undefined,
      status: (hashData.status as 'active' | 'ended') || 'active',
      channel: (hashData.channel as 'phone' | 'whatsapp' | 'website') || 'phone',
      startedAt: parseInt(hashData.startedAt) || Date.now(),
      endedAt: hashData.endedAt ? parseInt(hashData.endedAt) : undefined,
      durationInMinutes: hashData.durationInMinutes ? parseInt(hashData.durationInMinutes) : undefined,

      // Complex objects from JSON strings
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

      // Required fields
      isFirstAiResponse: true,
      assignedApiKeyIndex: parseInt(hashData.assignedApiKeyIndex) || 0
    } as Session;
  }

  /**
   * Serialize field value for Redis storage
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
      console.error(`❌ [Redis] Failed to serialize field value:`, error);

      sentry.trackError(error as Error, {
        sessionId: 'unknown',
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
export const voiceRedisClient = new VoiceRedisClient();

// Session manager interface - same instance, different interface
export const redisSessionManager = voiceRedisClient;
