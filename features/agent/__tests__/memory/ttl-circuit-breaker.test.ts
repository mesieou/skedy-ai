/**
 * TTL and Circuit Breaker Tests
 *
 * Tests TTL management and circuit breaker functionality
 */

import { simpleTTL, simpleCircuitBreaker, voiceRedisClient } from '../../memory';

describe('SimpleTTL', () => {
  const testCallId = 'test_ttl_call_123';

  beforeAll(async () => {
    await voiceRedisClient.connect();
  });

  afterEach(async () => {
    // Cleanup test keys
    const keys = await voiceRedisClient.client.keys(`*${testCallId}*`);
    if (keys.length > 0) {
      await Promise.all(keys.map(key => voiceRedisClient.del(key)));
    }
  });

  test('should set TTL for ended calls', async () => {
    // Create some test call data
    await voiceRedisClient.set(`call:${testCallId}:state`, JSON.stringify({ status: 'ended' }));
    await voiceRedisClient.set(`conversation:${testCallId}:messages`, JSON.stringify([]));

    // Set TTL
    await simpleTTL.setEndedCallTTL(testCallId);

    // Check that TTL was set (should be around 3600 seconds)
    const ttl1 = await simpleTTL.getTTL(`call:${testCallId}:state`);
    const ttl2 = await simpleTTL.getTTL(`conversation:${testCallId}:messages`);

    expect(ttl1).toBeGreaterThan(3500); // Should be close to 3600
    expect(ttl1).toBeLessThanOrEqual(3600);
    expect(ttl2).toBeGreaterThan(3500);
  });

  test('should remove TTL for active calls', async () => {
    // Create test data with TTL
    await voiceRedisClient.set(`call:${testCallId}:state`, JSON.stringify({ status: 'active' }), 60);

    // Remove TTL
    await simpleTTL.removeCallTTL(testCallId);

    // Check that TTL was removed (-1 means no TTL)
    const ttl = await simpleTTL.getTTL(`call:${testCallId}:state`);
    expect(ttl).toBe(-1);
  });

  test('should get TTL for specific keys', async () => {
    const testKey = `test:ttl:${testCallId}`;
    await voiceRedisClient.set(testKey, 'test-value', 30); // 30 second TTL

    const ttl = await simpleTTL.getTTL(testKey);
    expect(ttl).toBeGreaterThan(25);
    expect(ttl).toBeLessThanOrEqual(30);
  });
});

describe('SimpleCircuitBreaker', () => {
  beforeEach(() => {
    // Reset circuit breaker state
    simpleCircuitBreaker.forceReset();
  });

  test('should execute operation successfully when circuit is closed', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success');
    const mockFallback = jest.fn().mockResolvedValue('fallback');

    const result = await simpleCircuitBreaker.execute(mockOperation, mockFallback);

    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalled();
    expect(mockFallback).not.toHaveBeenCalled();
    expect(simpleCircuitBreaker.getState()).toBe('closed');
  });

  test('should use fallback when operation fails', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new Error('Redis down'));
    const mockFallback = jest.fn().mockResolvedValue('fallback-result');

    const result = await simpleCircuitBreaker.execute(mockOperation, mockFallback);

    expect(result).toBe('fallback-result');
    expect(mockOperation).toHaveBeenCalled();
    expect(mockFallback).toHaveBeenCalled();
  });

  test('should open circuit after threshold failures', async () => {
    const mockOperation = jest.fn().mockRejectedValue(new Error('Redis down'));
    const mockFallback = jest.fn().mockResolvedValue('fallback');

    // Trigger failures to reach threshold (default is 3)
    await simpleCircuitBreaker.execute(mockOperation, mockFallback);
    await simpleCircuitBreaker.execute(mockOperation, mockFallback);
    await simpleCircuitBreaker.execute(mockOperation, mockFallback);

    expect(simpleCircuitBreaker.getState()).toBe('open');
  });

  test('should use fallback immediately when circuit is open', async () => {
    const mockOperation = jest.fn();
    const mockFallback = jest.fn().mockResolvedValue('fallback-immediate');

    // Force circuit open
    const failingOp = jest.fn().mockRejectedValue(new Error('Fail'));
    await simpleCircuitBreaker.execute(failingOp, mockFallback);
    await simpleCircuitBreaker.execute(failingOp, mockFallback);
    await simpleCircuitBreaker.execute(failingOp, mockFallback);

    // Now circuit should be open
    expect(simpleCircuitBreaker.getState()).toBe('open');

    // This should go straight to fallback
    const result = await simpleCircuitBreaker.execute(mockOperation, mockFallback);

    expect(result).toBe('fallback-immediate');
    expect(mockOperation).not.toHaveBeenCalled(); // Should skip operation
  });

  test('should provide circuit statistics', () => {
    const stats = simpleCircuitBreaker.getStats();

    expect(stats).toHaveProperty('state');
    expect(stats).toHaveProperty('failureCount');
    expect(stats).toHaveProperty('lastFailureTime');
    expect(stats).toHaveProperty('timeSinceLastFailure');
  });

  test('should force reset circuit', () => {
    // Force some failures first
    simpleCircuitBreaker['onFailure']();
    simpleCircuitBreaker['onFailure']();

    expect(simpleCircuitBreaker.getStats().failureCount).toBe(2);

    // Force reset
    simpleCircuitBreaker.forceReset();

    const stats = simpleCircuitBreaker.getStats();
    expect(stats.state).toBe('closed');
    expect(stats.failureCount).toBe(0);
    expect(stats.lastFailureTime).toBe(0);
  });
});
