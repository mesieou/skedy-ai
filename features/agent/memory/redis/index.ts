/**
 * Redis Infrastructure for Voice Agent
 *
 * Production-ready Redis integration with:
 * - Redis client with connection management
 * - Event-driven service communication
 * - TTL management for call cleanup
 */

// Core Redis infrastructure
export { VoiceRedisClient, voiceRedisClient } from './redis-client';
export { SimpleCircuitBreaker, simpleCircuitBreaker } from './simple-circuit-breaker';
export { VoiceEventBus, createVoiceEventBus } from './event-bus';
export { SimpleTTL, simpleTTL } from './simple-ttl';

// Event types for type safety
export type {
  VoiceEvent,
  EventHandler,
  CallStartedEvent,
  UserResolvedEvent,
  MessageReceivedEvent,
  CallEndedEvent
} from './event-bus';

// Utility function to initialize all Redis infrastructure
export async function initializeVoiceRedis(): Promise<void> {
  const { voiceRedisClient } = await import('./redis-client');

  try {
    console.log('🔧 [Redis] Initializing voice Redis infrastructure...');

    // Connect to Redis
    await voiceRedisClient.connect();

    // Test connection
    const pingResult = await voiceRedisClient.ping();
    if (pingResult !== 'PONG') {
      throw new Error('Redis ping failed');
    }

    console.log('✅ [Redis] Voice Redis infrastructure initialized successfully');
    console.log(`🔍 [Redis] Connection status:`, voiceRedisClient.getConnectionStatus());

  } catch (error) {
    console.error('❌ [Redis] Failed to initialize voice Redis infrastructure:', error);
    throw error;
  }
}

// Utility function for graceful shutdown
export async function shutdownVoiceRedis(): Promise<void> {
  const { voiceRedisClient } = await import('./redis-client');

  try {
    console.log('🛑 [Redis] Shutting down voice Redis infrastructure...');

    // Redis cleanup

    // Disconnect from Redis
    await voiceRedisClient.disconnect();

    console.log('✅ [Redis] Voice Redis infrastructure shutdown complete');

  } catch (error) {
    console.error('❌ [Redis] Error during shutdown:', error);
    throw error;
  }
}
