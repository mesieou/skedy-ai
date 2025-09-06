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
      console.log('✅ [Redis] Voice client connected');
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
      console.log('🔌 [Redis] Voice client disconnected');
      this.isConnected = false;
      this.isConnecting = false;
    });

    // Pub/Sub specific handlers
    this.pubClient.on('connect', () => {
      console.log('✅ [Redis] Pub client connected');
    });

    this.subClient.on('connect', () => {
      console.log('✅ [Redis] Sub client connected');
    });
  }

  // ============================================================================
  // MAIN CLIENT OPERATIONS
  // ============================================================================

  async get(key: string): Promise<string | null> {
    return await simpleCircuitBreaker.execute(
      () => this.client.get(key),
      () => Promise.resolve(null) // Fallback: return null if Redis fails
    );
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
      console.log(`🔌 [RedisClient] First subscription to channel: ${channel}`);
      await this.subClient.subscribe(channel);
      console.log(`✅ [RedisClient] Redis subscription created for channel: ${channel}`);
    }

    const currentCallbacks = this.subscribedChannels.get(channel)!;
    currentCallbacks.push(callback);
    console.log(`📝 [RedisClient] Added callback to channel: ${channel} (total callbacks: ${currentCallbacks.length})`);
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
        console.log(`📬 [RedisClient] Message received on channel: ${channel}, dispatching to ${callbacks.length} callback${callbacks.length > 1 ? 's' : ''}`);
        callbacks.forEach((callback, index) => {
          try {
            console.log(`🔄 [RedisClient] Executing callback ${index + 1}/${callbacks.length} for channel: ${channel}`);
            callback(message);
          } catch (error) {
            console.error(`❌ [Redis] Error in channel callback ${index + 1} for ${channel}:`, error);
          }
        });
      } else {
        console.log(`⚠️ [RedisClient] No callbacks found for channel: ${channel}`);
      }
    });

    // Single pmessage handler that dispatches to all pattern callbacks
    this.subClient.on('pmessage', (pattern: string, channel: string, message: string) => {
      const callbacks = this.subscribedPatterns.get(pattern);
      if (callbacks) {
        console.log(`📬 [RedisClient] Pattern message received on pattern: ${pattern}, channel: ${channel}, dispatching to ${callbacks.length} callback${callbacks.length > 1 ? 's' : ''}`);
        callbacks.forEach((callback, index) => {
          try {
            console.log(`🔄 [RedisClient] Executing pattern callback ${index + 1}/${callbacks.length} for pattern: ${pattern}`);
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
        console.log('✅ [Redis] Already connected');
        return;
      }

      if (this.isConnecting) {
        console.log('⏳ [Redis] Connection already in progress');
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

      console.log('✅ [Redis] All voice clients connected successfully');
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
    console.log('🔌 [Redis] All voice clients disconnected');
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
