/**
 * Voice Redis Client
 *
 * Production-ready Redis client for voice agent with:
 * - Single primary + replicas (cluster mode disabled)
 * - Separate DB=1 for voice isolation
 * - Connection pooling with ioredis
 * - Pub/Sub support for event communication
 */

import Redis from 'ioredis';
import { simpleCircuitBreaker } from './simple-circuit-breaker';

interface VoiceRedisConfig {
  host: string;
  port: number;
  db: number;
  password?: string;
  poolSize: number;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
  enableOfflineQueue: boolean;
}

export class VoiceRedisClient {
  public readonly client: Redis; // Expose for direct operations
  private pubClient: Redis;
  private subClient: Redis;
  private config: VoiceRedisConfig;
  private isConnecting = false;
  private isConnected = false;
  private subscribedChannels: Map<string, ((message: string) => void)[]> = new Map(); // Track channel callbacks
  private subscribedPatterns: Map<string, ((channel: string, message: string) => void)[]> = new Map(); // Track pattern callbacks
  private eventHandlersSetup = false;

  // Operation monitoring per call
  private readonly callStats = new Map<string, {
    operationCount: number;
    writeCount: number;
    readCount: number;
    sessionStartTime: number;
  }>();
  private currentCallId: string | null = null;
  private readonly WRITE_LIMIT_PER_MINUTE = 100;
  private readonly LOG_OPERATIONS = true;

  constructor() {
    this.config = this.getRedisConfig();
    this.client = this.createRedisConnection('main');
    this.pubClient = this.client.duplicate({ connectionName: 'pub' });
    this.subClient = this.client.duplicate({ connectionName: 'sub' });

    this.setupEventHandlers();
  }

  private getRedisConfig(): VoiceRedisConfig {
    return {
      host: process.env.VOICE_REDIS_HOST || 'localhost',
      port: parseInt(process.env.VOICE_REDIS_PORT || '6379'),
      db: parseInt(process.env.VOICE_REDIS_DB || '0'), // Always use DB 0 for compatibility
      password: process.env.VOICE_REDIS_PASSWORD,
      poolSize: parseInt(process.env.VOICE_REDIS_POOL_SIZE || '20'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true // Enable for pattern subscriptions to work
    };
  }

  private createRedisConnection(connectionName: string): Redis {
    return new Redis({
      host: this.config.host,
      port: this.config.port,
      db: this.config.db,
      password: this.config.password,
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      enableOfflineQueue: this.config.enableOfflineQueue,
      lazyConnect: true,
      connectionName: `voice_${connectionName}`,
      keepAlive: 30000,
      family: 4, // IPv4
    });
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.isConnecting = false;
    });

    this.client.on('error', (error: Error) => {
      console.error('❌ [Redis] Voice client error:', error.message);
      this.isConnecting = false;
    });

    this.client.on('close', () => {
      this.isConnected = false;
      this.isConnecting = false;
    });

    // Pub/Sub specific handlers
    this.pubClient.on('connect', () => {
    });

    this.subClient.on('connect', () => {
    });
  }

  // ============================================================================
  // OPERATION LOGGING & MONITORING
  // ============================================================================

  private logOperation(operation: string, key: string, isWrite: boolean = false): void {
    // Extract callId from key (e.g., "voice:call:rtc_123:state" -> "rtc_123")
    const keyParts = key.split(':');
    const callId = keyParts.length >= 3 ? keyParts[2] : 'unknown';

    // Initialize stats for new calls
    if (!this.callStats.has(callId)) {
      this.callStats.set(callId, {
        operationCount: 0,
        writeCount: 0,
        readCount: 0,
        sessionStartTime: Date.now()
      });
    }

    const stats = this.callStats.get(callId)!;
    stats.operationCount++;
    if (isWrite) {
      stats.writeCount++;
    } else {
      stats.readCount++;
    }

    if (this.LOG_OPERATIONS) {
      const sessionTime = Math.round((Date.now() - stats.sessionStartTime) / 1000);
      const opType = isWrite ? '✏️ WRITE' : '📖 READ';
      console.log(`🔍 [Redis] ${opType} #${stats.operationCount} (${sessionTime}s): ${operation}(${key.split(':').pop()}) [${callId.substring(0, 8)}]`);
    }

    // Log summary every 10 operations per call
    if (stats.operationCount % 10 === 0) {
      const sessionTime = Math.round((Date.now() - stats.sessionStartTime) / 1000);
      console.log(`📊 [Redis] Call Summary [${callId.substring(0, 8)}] (${sessionTime}s): ${stats.operationCount} ops (${stats.writeCount} writes, ${stats.readCount} reads)`);
    }
  }

  public getOperationStats(callId?: string): { total: number; writes: number; reads: number; sessionDuration: number } {
    if (callId && this.callStats.has(callId)) {
      const stats = this.callStats.get(callId)!;
      return {
        total: stats.operationCount,
        writes: stats.writeCount,
        reads: stats.readCount,
        sessionDuration: Math.round((Date.now() - stats.sessionStartTime) / 1000)
      };
    }

    // Return aggregated stats if no specific call requested
    let total = 0, writes = 0, reads = 0;
    for (const stats of this.callStats.values()) {
      total += stats.operationCount;
      writes += stats.writeCount;
      reads += stats.readCount;
    }

    return { total, writes, reads, sessionDuration: 0 };
  }

  public resetOperationStats(callId?: string): void {
    if (callId) {
      this.callStats.delete(callId);
      console.log(`🔄 [Redis] Operation stats reset for call: ${callId}`);
    } else {
      this.callStats.clear();
      console.log('🔄 [Redis] All operation stats reset');
    }
  }

  // ============================================================================
  // MAIN CLIENT OPERATIONS
  // ============================================================================

  async get(key: string): Promise<string | null> {
    this.logOperation('GET', key, false);
    return await simpleCircuitBreaker.execute(
      () => this.client.get(key),
      () => Promise.resolve(null) // Fallback: return null if Redis fails
    );
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    this.logOperation('SET', key, true);
    if (ttlSeconds) {
      return await this.client.setex(key, ttlSeconds, value);
    }
    return await this.client.set(key, value);
  }

  async del(key: string): Promise<number> {
    this.logOperation('DEL', key, true);
    return await this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return await this.client.exists(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    return await this.client.expire(key, ttlSeconds);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return await this.client.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return await this.client.hset(key, field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.client.hgetall(key);
  }

  // ============================================================================
  // LIST OPERATIONS (for efficient conversation storage)
  // ============================================================================

  async lpush(key: string, value: string): Promise<number> {
    this.logOperation('LPUSH', key, true);
    return await this.client.lpush(key, value);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    this.logOperation('LRANGE', key, false);
    return await this.client.lrange(key, start, stop);
  }

  async llen(key: string): Promise<number> {
    this.logOperation('LLEN', key, false);
    return await this.client.llen(key);
  }

  // ============================================================================
  // PUB/SUB OPERATIONS
  // ============================================================================

  async publish(channel: string, message: string): Promise<number> {
    return await this.pubClient.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    // Setup global event handlers once
    this.setupGlobalEventHandlers();

    // Add callback to channel
    if (!this.subscribedChannels.has(channel)) {
      this.subscribedChannels.set(channel, []);
      await this.subClient.subscribe(channel);
    }

    const currentCallbacks = this.subscribedChannels.get(channel)!;
    currentCallbacks.push(callback);
  }

  async psubscribe(pattern: string, callback: (channel: string, message: string) => void): Promise<void> {
    // Setup global event handlers once
    this.setupGlobalEventHandlers();

    // Add callback to pattern
    if (!this.subscribedPatterns.has(pattern)) {
      this.subscribedPatterns.set(pattern, []);
      await this.subClient.psubscribe(pattern);
    }
    this.subscribedPatterns.get(pattern)!.push(callback);
  }

  private setupGlobalEventHandlers(): void {
    if (this.eventHandlersSetup) {
      return;
    }

    // Single message handler that dispatches to all channel callbacks
    this.subClient.on('message', (channel: string, message: string) => {
      const callbacks = this.subscribedChannels.get(channel);
      if (callbacks) {
        callbacks.forEach((callback) => {
          try {
            callback(message);
          } catch (error) {
            console.error(`❌ [Redis] Error in channel callback for ${channel}:`, error);
          }
        });
      }
    });

    // Single pmessage handler that dispatches to all pattern callbacks
    this.subClient.on('pmessage', (pattern: string, channel: string, message: string) => {
      const callbacks = this.subscribedPatterns.get(pattern);
      if (callbacks) {
        callbacks.forEach((callback, index) => {
          try {
            callback(channel, message);
          } catch (error) {
            console.error(`❌ [Redis] Error in pattern callback ${index + 1} for ${pattern}:`, error);
          }
        });
      } else {
        console.log(`⚠️ [RedisClient] No callbacks found for pattern: ${pattern}`);
      }
    });

    this.eventHandlersSetup = true;
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  async connect(): Promise<void> {
    try {
      // Check if already connected or connecting using our state tracking
      if (this.isConnected) {
        return;
      }

      if (this.isConnecting) {
        return;
      }

      this.isConnecting = true;

      // Check each client individually before connecting
      const connectionPromises: Promise<void>[] = [];

      if (this.client.status !== 'ready' && this.client.status !== 'connecting') {
        connectionPromises.push(this.client.connect());
      }

      if (this.pubClient.status !== 'ready' && this.pubClient.status !== 'connecting') {
        connectionPromises.push(this.pubClient.connect());
      }

      if (this.subClient.status !== 'ready' && this.subClient.status !== 'connecting') {
        connectionPromises.push(this.subClient.connect());
      }

      if (connectionPromises.length > 0) {
        await Promise.all(connectionPromises);
      }

    } catch (error) {
      this.isConnecting = false;
      console.error('❌ [Redis] Connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await Promise.all([
      this.client.disconnect(),
      this.pubClient.disconnect(),
      this.subClient.disconnect()
    ]);
  }

  async ping(): Promise<string> {
    return await this.client.ping();
  }

  getConnectionStatus(): {
    main: string;
    pub: string;
    sub: string;
    isConnected: boolean;
    isConnecting: boolean;
  } {
    return {
      main: this.client.status,
      pub: this.pubClient.status,
      sub: this.subClient.status,
      isConnected: this.isConnected,
      isConnecting: this.isConnecting
    };
  }
}

// Singleton instance
export const voiceRedisClient = new VoiceRedisClient();
