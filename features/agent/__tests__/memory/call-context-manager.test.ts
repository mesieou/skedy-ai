/**
 * Call Context Manager Tests
 *
 * Tests call lifecycle, state management, and event coordination
 */

import { CallContextManager } from '../../memory/call-context-manager';
import { voiceEventBus, agentServiceContainer } from '../../memory';
import type { User } from '../../../shared/lib/database/types/user';
import type { Business } from '../../../shared/lib/database/types/business';
import type { Service } from '../../../shared/lib/database/types/service';
import { UserRole } from '../../../shared/lib/database/types/user';

describe('CallContextManager', () => {
  let contextManager: CallContextManager;
  const testCallId = 'test_call_context_123';
  const testBusinessId = '6f875e10-5026-40be-92ff-27453bc33781';

  beforeAll(async () => {
    await voiceEventBus.initialize();
    await agentServiceContainer.initialize();
    contextManager = new CallContextManager();
  });

  afterEach(async () => {
    // Cleanup test data
    try {
      await contextManager.endCall(testCallId, 'test_cleanup');
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Call Initialization', () => {
    test('should initialize call context successfully', async () => {
      const callData = {
        callId: testCallId,
        businessId: testBusinessId,
        userId: 'test_user_123',
        phoneNumber: '+61473164581',
        user: { id: 'test_user_123', first_name: 'Test User', role: UserRole.CUSTOMER, business_id: testBusinessId } as User,
        business: { id: testBusinessId, name: 'Test Business', email: 'test@example.com', phone_number: '+61473164581', address: 'Test Address' } as Business
      };

      await contextManager.initializeCall(callData);

      const callContext = await contextManager.getCallContext(testCallId);
      expect(callContext).not.toBeNull();
      expect(callContext?.callId).toBe(testCallId);
      expect(callContext?.businessId).toBe(testBusinessId);
    });

    test('should update call state', async () => {
      await contextManager.updateCallState(testCallId, {
        status: 'active',
        webSocketStatus: 'connected'
      });

      const callContext = await contextManager.getCallContext(testCallId);
      expect(callContext?.callState.status).toBe('active');
      expect(callContext?.callState.webSocketStatus).toBe('connected');
    });
  });

  describe('Message Management', () => {
    test('should add user messages', async () => {
      const message = await contextManager.addUserMessage(
        testCallId,
        'Hello, I need a quote for moving',
        'test_item_123'
      );

      expect(message).toHaveProperty('id');
      expect(message.content).toBe('Hello, I need a quote for moving');
      expect(message.role).toBe('user');
      expect(message.openai_item_id).toBe('test_item_123');
    });

    test('should add assistant messages', async () => {
      const message = await contextManager.addAssistantMessage(
        testCallId,
        'I can help you with that! Where are you moving from?'
      );

      expect(message).toHaveProperty('id');
      expect(message.content).toBe('I can help you with that! Where are you moving from?');
      expect(message.role).toBe('assistant');
    });

    // System messages removed - only track user and agent messages

    test('should retrieve recent messages', async () => {
      // Add some messages
      await contextManager.addUserMessage(testCallId, 'Message 1');
      await contextManager.addAssistantMessage(testCallId, 'Response 1');
      await contextManager.addUserMessage(testCallId, 'Message 2');

      const recentMessages = await contextManager.getRecentMessages(testCallId, 2);

      expect(recentMessages).toHaveLength(2);
      expect(recentMessages[0].content).toBe('Response 1');
      expect(recentMessages[1].content).toBe('Message 2');
    });
  });

  describe('Service Management', () => {
    test('should set selected service', async () => {
      const testService = {
        id: 'test_service_123',
        name: 'Test Moving Service',
        description: 'Test service for unit tests'
      };

      await contextManager.setSelectedService(testCallId, { ...testService, business_id: testBusinessId, location_type: 'mobile' } as unknown as Service);

      const callContext = await contextManager.getCallContext(testCallId);
      expect(callContext?.callState.selectedService?.name).toBe('Test Moving Service');
    });

    test('should update available tools', async () => {
      const tools = ['select_service', 'get_quote', 'book_appointment'];

      await contextManager.updateAvailableTools(testCallId, tools);

      const callContext = await contextManager.getCallContext(testCallId);
      expect(callContext?.callState.toolsAvailable).toEqual(tools);
    });
  });

  describe('Call Lifecycle', () => {
    test('should end call and set TTL', async () => {
      // First initialize the call
      await contextManager.initializeCall({
        callId: testCallId,
        businessId: testBusinessId,
        userId: null,
        phoneNumber: '+61473164581',
        user: null,
        business: { id: testBusinessId, name: 'Test Business', email: 'test@example.com', phone_number: '+61473164581', address: 'Test Address' } as Business
      });

      // End the call
      await contextManager.endCall(testCallId, 'test_completed');

      const callContext = await contextManager.getCallContext(testCallId);
      expect(callContext?.callState.status).toBe('ended');
    });

    test('should get call summary', async () => {
      const summary = await contextManager.getCallSummary(testCallId);

      expect(summary).toHaveProperty('exists');
      expect(summary).toHaveProperty('status');
      expect(summary).toHaveProperty('messageCount');
    });
  });
});
