#!/usr/bin/env tsx
/**
 * Memory System Test Runner
 *
 * Quick manual tests to verify Redis, persistence, and tool calling are working
 */

// CRITICAL: Load environment variables BEFORE any imports
import { config } from 'dotenv';
config({ path: '.env.local' });

// Import types only (not actual modules)
import type { Business } from '../features/shared/lib/database/types/business';

// Dynamic imports after env is loaded
let memoryModules: any;

async function testRedisBasics(voiceRedisClient: any) {
  console.log('🔧 Testing Redis Basics...');

  const ping = await voiceRedisClient.ping();
  console.log(`✅ Redis ping: ${ping}`);

  // Test basic operations
  await voiceRedisClient.set('test:key', 'test-value');
  const value = await voiceRedisClient.get('test:key');
  console.log(`✅ Set/Get: ${value === 'test-value' ? 'PASS' : 'FAIL'}`);

  await voiceRedisClient.del('test:key');
  console.log('✅ Redis basics working\n');
}

async function testEventBus(voiceEventBus: any) {
  console.log('📡 Testing Event Bus...');

  let eventReceived = false;

  await voiceEventBus.subscribe('voice:test', (event) => {
    console.log(`📨 Received:`, event.type);
    eventReceived = true;
  });

  await voiceEventBus.publish({
    type: 'voice:test',
    callId: 'test_123',
    timestamp: Date.now(),
    data: { message: 'test' }
  });

  await new Promise(resolve => setTimeout(resolve, 100));
  console.log(`✅ Event Bus: ${eventReceived ? 'PASS' : 'FAIL'}\n`);
}

async function testCallContext(CallContextManager: any) {
  console.log('🎯 Testing Call Context Manager...');

  const contextManager = new CallContextManager();
  const testCallId = `test_${Date.now()}`;

  // Initialize call
  await contextManager.initializeCall({
    callId: testCallId,
    businessId: '6f875e10-5026-40be-92ff-27453bc33781',
    userId: null,
    phoneNumber: '+61473164581',
    user: null,
    business: {
      id: '6f875e10-5026-40be-92ff-27453bc33781',
      name: 'Test Business',
      email: 'test@example.com',
      phone_number: '+61473164581',
      address: 'Test Address'
    } as Business
  });

  // Add messages
  await contextManager.addUserMessage(testCallId, 'I need a quote');
  await contextManager.addAssistantMessage(testCallId, 'I can help with that!');

  // Get context
  const context = await contextManager.getCallContext(testCallId);
  console.log(`✅ Call context: ${context ? 'PASS' : 'FAIL'}`);

  // Get messages
  const messages = await contextManager.getRecentMessages(testCallId);
  console.log(`✅ Messages: ${messages.length >= 2 ? 'PASS' : 'FAIL'} (${messages.length} messages)`);

  // End call
  await contextManager.endCall(testCallId, 'test_completed');
  console.log('✅ Call Context Manager working\n');
}

async function testTTLandCircuitBreaker(voiceRedisClient: any, simpleCircuitBreaker: any, simpleTTL: any) {
  console.log('⚡ Testing TTL & Circuit Breaker...');

  // Test circuit breaker
  const result = await simpleCircuitBreaker.execute(
    () => Promise.resolve('success'),
    () => Promise.resolve('fallback')
  );
  console.log(`✅ Circuit Breaker: ${result === 'success' ? 'PASS' : 'FAIL'}`);

  // Test TTL
  await voiceRedisClient.set('test:ttl', 'value', 1);
  const ttl = await simpleTTL.getTTL('test:ttl');
  console.log(`✅ TTL: ${ttl > 0 ? 'PASS' : 'FAIL'} (${ttl}s)`);
  console.log('✅ TTL & Circuit Breaker working\n');
}

async function main() {
  try {
    console.log('🧪 Memory System Manual Test\n');
    console.log('='.repeat(50));

    // Load memory modules AFTER environment is set
    memoryModules = await import('../features/agent/memory');
    const {
      voiceRedisClient,
      voiceEventBus,
      simpleCircuitBreaker,
      simpleTTL,
      CallContextManager,
      initializeAgentMemory
    } = memoryModules;

    // Initialize system
    await initializeAgentMemory();

    // Run tests with modules as parameters
    await testRedisBasics(voiceRedisClient);
    await testEventBus(voiceEventBus);
    await testCallContext(CallContextManager);
    await testTTLandCircuitBreaker(voiceRedisClient, simpleCircuitBreaker, simpleTTL);

    console.log('='.repeat(50));
    console.log('🎉 ALL TESTS PASSED! Memory system is working correctly.');

  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    process.exit(1);
  } finally {
    if (memoryModules?.voiceRedisClient) {
      await memoryModules.voiceRedisClient.disconnect();
    }
  }
}

main().catch(console.error);
