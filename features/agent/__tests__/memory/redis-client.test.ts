/**
 * Redis Client Tests
 *
 * Tests Redis connectivity, operations, and circuit breaker functionality
 */

import { voiceRedisClient, simpleCircuitBreaker } from '../../memory';

describe('VoiceRedisClient', () => {
  beforeAll(async () => {
    await voiceRedisClient.connect();
  });

  afterAll(async () => {
    // Cleanup test data
    await voiceRedisClient.del('test:*');
    await voiceRedisClient.disconnect();
  });

  describe('Basic Operations', () => {
    test('should connect and ping successfully', async () => {
      const pingResult = await voiceRedisClient.ping();
      expect(pingResult).toBe('PONG');
    });

    test('should set and get values', async () => {
      const key = 'test:basic:value';
      const value = 'test-value-123';

      await voiceRedisClient.set(key, value);
      const retrieved = await voiceRedisClient.get(key);

      expect(retrieved).toBe(value);
    });

    test('should set values with TTL', async () => {
      const key = 'test:ttl:value';
      const value = 'expires-soon';

      await voiceRedisClient.set(key, value, 1); // 1 second TTL
      const immediate = await voiceRedisClient.get(key);
      expect(immediate).toBe(value);

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 1100));
      const expired = await voiceRedisClient.get(key);
      expect(expired).toBeNull();
    });

    test('should handle hash operations', async () => {
      const key = 'test:hash:data';

      await voiceRedisClient.hset(key, 'field1', 'value1');
      await voiceRedisClient.hset(key, 'field2', 'value2');

      const field1 = await voiceRedisClient.hget(key, 'field1');
      const field2 = await voiceRedisClient.hget(key, 'field2');
      const allData = await voiceRedisClient.hgetall(key);

      expect(field1).toBe('value1');
      expect(field2).toBe('value2');
      expect(allData).toEqual({ field1: 'value1', field2: 'value2' });
    });

    test('should delete keys', async () => {
      const key = 'test:delete:me';

      await voiceRedisClient.set(key, 'will-be-deleted');
      expect(await voiceRedisClient.exists(key)).toBe(1);

      await voiceRedisClient.del(key);
      expect(await voiceRedisClient.exists(key)).toBe(0);
    });
  });

  describe('Circuit Breaker Integration', () => {
    test('should use circuit breaker for get operations', async () => {
      const key = 'test:circuit:breaker';
      const value = 'protected-value';

      // This should go through circuit breaker
      await voiceRedisClient.set(key, value);
      const retrieved = await voiceRedisClient.get(key);

      expect(retrieved).toBe(value);
      expect(simpleCircuitBreaker.getState()).toBe('closed');
    });

    test('should provide connection status', () => {
      const status = voiceRedisClient.getConnectionStatus();

      expect(status).toHaveProperty('main');
      expect(status).toHaveProperty('pub');
      expect(status).toHaveProperty('sub');
      expect(status).toHaveProperty('isConnected');
      expect(status).toHaveProperty('isConnecting');
    });
  });
});
