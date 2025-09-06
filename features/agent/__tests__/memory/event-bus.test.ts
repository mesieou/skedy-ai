/**
 * Event Bus Tests
 *
 * Tests Redis pub/sub functionality and event handling
 */

import { voiceEventBus, voiceRedisClient, type VoiceEvent } from '../../memory';

describe('VoiceEventBus', () => {
  beforeAll(async () => {
    await voiceEventBus.initialize();
  });

  afterAll(async () => {
    // Clean up Redis subscriptions
    await voiceRedisClient.disconnect();
  });

  describe('Event Publishing & Subscribing', () => {
    test('should publish and receive events', async () => {
      const testCallId = `test_call_${Date.now()}`;
      const uniqueEventType = `voice:test:simple:${Date.now()}`;
      let receivedEvent: VoiceEvent | null = null;

      // Subscribe to test event
      await voiceEventBus.subscribe(uniqueEventType, (event) => {
        receivedEvent = event;
      });

      // Publish test event
      const testEvent: VoiceEvent = {
        type: uniqueEventType,
        callId: testCallId,
        timestamp: Date.now(),
        data: { message: 'Hello from test' }
      };

      await voiceEventBus.publish(testEvent);

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent!.type).toBe(uniqueEventType);
      expect(receivedEvent!.callId).toBe(testCallId);
      expect(receivedEvent!.data.message).toBe('Hello from test');
    });

    test('should handle multiple subscribers to same event', async () => {
      const testCallId = `test_call_${Date.now()}`;
      const uniqueEventType = `voice:test:multiple:${Date.now()}`;
      const receivedEvents: VoiceEvent[] = [];

      // Multiple subscribers to unique event type
      await voiceEventBus.subscribe(uniqueEventType, (event) => {
        receivedEvents.push({ ...event, data: { ...event.data, handler: 'handler1' } });
      });

      await voiceEventBus.subscribe(uniqueEventType, (event) => {
        receivedEvents.push({ ...event, data: { ...event.data, handler: 'handler2' } });
      });

      // Publish event
      await voiceEventBus.publish({
        type: uniqueEventType,
        callId: testCallId,
        timestamp: Date.now(),
        data: { message: 'Multiple handlers test' }
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedEvents).toHaveLength(2);
      expect(receivedEvents[0].data.handler).toBe('handler1');
      expect(receivedEvents[1].data.handler).toBe('handler2');
    });

    test('should create events with correct structure', () => {
      const testCallId = 'test_call_123';
      const testData = { key: 'value', number: 42 };

      const event = voiceEventBus.createEvent('voice:test:create', testCallId, testData);

      expect(event).toHaveProperty('type', 'voice:test:create');
      expect(event).toHaveProperty('callId', testCallId);
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('data', testData);
      expect(typeof event.timestamp).toBe('number');
    });
  });

  describe('Call-Specific Events', () => {
    test('should handle call-specific event subscriptions', async () => {
      const testCallId = `test_call_${Date.now()}`;
      let receivedEvent: VoiceEvent | null = null;

      // Subscribe to call-specific events
      await voiceEventBus.subscribeToCallEvents(testCallId, (event) => {
        receivedEvent = event;
      });

      // Publish call-specific event
      await voiceEventBus.publish({
        type: 'voice:call:test',
        callId: testCallId,
        timestamp: Date.now(),
        data: { message: 'Call-specific test' }
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent!.callId).toBe(testCallId);
    });
  });
});
