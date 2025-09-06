/**
 * Memory System Integration Tests
 *
 * End-to-end tests of the complete memory system workflow
 */

import {
  CallContextManager,
  voiceEventBus,
  voiceRedisClient,
  initializeAgentMemory,
  agentServiceContainer
} from '../../memory';
import { AuthUserRepository } from '@/features/shared/lib/database/repositories/auth-user-repository';
import type { AuthUser } from '@/features/shared/lib/database/types/auth-user';
import { UserSeeder } from '@/features/shared/lib/database/seeds/user-seeder';
import type { User } from '@/features/shared/lib/database/types/user';
import type { Business } from '@/features/shared/lib/database/types/business';
import type { Service } from '@/features/shared/lib/database/types/service';
import { UserRole } from '@/features/shared/lib/database/types/user';
import { DatabaseClientFactory, ClientType } from '@/features/shared/lib/client-factory';

describe('Memory System Integration', () => {
  let contextManager: CallContextManager;
  let authUserRepository: AuthUserRepository;
  let userSeeder: UserSeeder;
  let testAuthUser: AuthUser | null = null;
  let testAppUser: User | null = null;
  const testBusinessId = '6f875e10-5026-40be-92ff-27453bc33781';

  beforeAll(async () => {
    // Initialize the complete memory system
    await initializeAgentMemory();
    contextManager = new CallContextManager();
    authUserRepository = new AuthUserRepository();
    userSeeder = new UserSeeder();

    // Override the repositories' getClient method to always use admin client
    (authUserRepository as unknown as { getClient: () => Promise<unknown> }).getClient = async () => {
      return DatabaseClientFactory.getClient({ type: ClientType.ADMIN });
    };
    // UserSeeder uses repository internally, so we need to override its repository's getClient too
    ((userSeeder as unknown as { repository: { getClient: () => Promise<unknown> } }).repository).getClient = async () => {
      return DatabaseClientFactory.getClient({ type: ClientType.ADMIN });
    };
  });

  afterAll(async () => {
    // Clean up application user if created
    if (testAppUser) {
      try {
        await userSeeder.deleteOne({ id: testAppUser.id });
        console.log(`🧹 Cleaned up application user: ${testAppUser.email}`);
      } catch (error) {
        console.warn('Failed to clean up application user:', error);
      }
    }

    // Clean up auth user if created
    if (testAuthUser) {
      try {
        await authUserRepository.deleteOne({ id: testAuthUser.id });
        console.log(`🧹 Cleaned up auth user: ${testAuthUser.email}`);
      } catch (error) {
        console.warn('Failed to clean up auth user:', error);
      }
    }

    // Reset service container for clean test state
    agentServiceContainer.reset();

    // Wait for any pending async operations to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    await voiceRedisClient.disconnect();
  });

  test('should handle complete call lifecycle', async () => {
    const testCallId = `lifecycle_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('🧪 Testing complete call lifecycle...');

    try {
      // 1. Initialize call
      await contextManager.initializeCall({
        callId: testCallId,
        businessId: testBusinessId,
        userId: null,
        phoneNumber: '+61473164581',
        user: null,
        business: { id: testBusinessId, name: 'Test Business', email: 'test@example.com', phone_number: '+61473164581', address: 'Test Address' } as Business
      });

      let callContext = await contextManager.getCallContext(testCallId);
      expect(callContext).not.toBeNull();
      expect(callContext?.callState.status).toBe('connecting');

      // 2. Simulate user resolution (required for conversation persistence)
      await voiceEventBus.publish({
        type: 'voice:user:resolved',
        callId: testCallId,
        timestamp: Date.now(),
        data: {
          user: { id: 'cb62d77f-6c1c-4d4d-b82d-b8c84da12521', first_name: 'Test User' }, // Use valid UUID format
          isReturningCustomer: false
        }
      });

      // 3. Simulate conversation
      await contextManager.addUserMessage(testCallId, 'I need a quote for moving');
      await contextManager.addAssistantMessage(testCallId, 'I can help with that! Where are you moving from?');
      await contextManager.addUserMessage(testCallId, 'From Melbourne to Sydney');

      const messages = await contextManager.getRecentMessages(testCallId);
      expect(messages.length).toBeGreaterThanOrEqual(3);

      // 4. Simulate service selection
      const testService = {
        id: 'test_service_123',
        name: 'Interstate Moving',
        description: 'Professional interstate moving service'
      };

      await contextManager.setSelectedService(testCallId, { ...testService, business_id: testBusinessId, location_type: 'mobile' } as unknown as Service);

      callContext = await contextManager.getCallContext(testCallId);
      expect(callContext?.callState.selectedService?.name).toBe('Interstate Moving');

      // 5. Update tools availability
      await contextManager.updateAvailableTools(testCallId, ['get_quote', 'book_appointment']);

      callContext = await contextManager.getCallContext(testCallId);
      expect(callContext?.callState.toolsAvailable).toContain('get_quote');

      // 6. End call
      await contextManager.endCall(testCallId, 'customer_completed');

      callContext = await contextManager.getCallContext(testCallId);
      expect(callContext?.callState.status).toBe('ended');

      console.log('✅ Complete lifecycle test PASSED');

    } finally {
      // Clean up this test's call
      try {
        await contextManager.endCall(testCallId, 'test_cleanup');
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch {
        // Ignore cleanup errors
      }
    }
  }, 15000); // Increase timeout to 15 seconds

  test('should handle WebSocket events', async () => {
    const testCallId = `ws_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Test WebSocket event handling

    try {
      // Initialize call first
      await contextManager.initializeCall({
        callId: testCallId,
        businessId: testBusinessId,
        userId: null,
        phoneNumber: '+61473164581',
        user: null,
        business: { id: testBusinessId, name: 'Test Business', email: 'test@example.com', phone_number: '+61473164581', address: 'Test Address' } as Business
      });

      // Subscribe to state changes
      await voiceEventBus.subscribe('voice:call:state_changed', () => {
        // State change handled
      });

      // Simulate WebSocket connection
      await voiceEventBus.publish({
        type: 'voice:websocket:connected',
        callId: testCallId,
        timestamp: Date.now(),
        data: {}
      });

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 300));

      const callContext = await contextManager.getCallContext(testCallId);
      expect(callContext?.callState.webSocketStatus).toBe('connected');

    } finally {
      // Clean up this test's call
      try {
        await contextManager.endCall(testCallId, 'test_cleanup');
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  test('should get call summary with statistics', async () => {
    const testCallId = `summary_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Initialize and add some data
      await contextManager.initializeCall({
        callId: testCallId,
        businessId: testBusinessId,
        userId: 'test_user',
        phoneNumber: '+61473164581',
        user: { id: 'test_user', first_name: 'Test', role: UserRole.CUSTOMER, business_id: testBusinessId } as User,
        business: { id: testBusinessId, name: 'Test Business', email: 'test@example.com', phone_number: '+61473164581', address: 'Test Address' } as Business
      });

      await contextManager.addUserMessage(testCallId, 'Test message 1');
      await contextManager.addAssistantMessage(testCallId, 'Test response 1');

      const summary = await contextManager.getCallSummary(testCallId);

      expect(summary.exists).toBe(true);
      expect(summary.messageCount).toBeGreaterThan(0);
      expect(summary).toHaveProperty('status');
      expect(summary).toHaveProperty('lastActivity');

    } finally {
      // Clean up this test's call
      try {
        await contextManager.endCall(testCallId, 'test_cleanup');
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch {
        // Ignore cleanup errors
      }
    }
  }, 10000); // Increase timeout to 10 seconds

  test('should persist complete conversation to database with real user', async () => {
    const testCallId = `persistence_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let conversationPersistedEventReceived = false;

    console.log('🗄️ Testing conversation persistence with real user...');

    try {
      // 1. Create a real auth user (Supabase auth)
      testAuthUser = await authUserRepository.create({
        email: `test-user-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        email_confirm: true
      });

      console.log(`🔐 Created auth user: ${testAuthUser.email} (ID: ${testAuthUser.id})`);

      // 2. Create corresponding application user (using auth user ID)
      testAppUser = await userSeeder.createWith({
        role: UserRole.CUSTOMER,
        first_name: 'Test',
        last_name: 'Customer',
        business_id: testBusinessId,
        phone_number: '+61473164581',
        email: testAuthUser.email
      }, { id: testAuthUser.id });

      console.log(`👤 Created application user: ${testAppUser.email} (ID: ${testAppUser.id})`);

      // 3. Subscribe to conversation persistence events (will receive multiple due to test setup)
      await voiceEventBus.subscribe('voice:conversation:persisted', (event) => {
        console.log(`🔍 [DEBUG] Persistence event: callId=${event.callId}, expected=${testCallId}, match=${event.callId === testCallId}, alreadyReceived=${conversationPersistedEventReceived}`);
        if (event.callId === testCallId && !conversationPersistedEventReceived) {
          conversationPersistedEventReceived = true;
          console.log(`💾 Conversation persisted event received for ${testCallId}`);
        }
      });

      // 4. Initialize call with real user
      await contextManager.initializeCall({
        callId: testCallId,
        businessId: testBusinessId,
        userId: null, // Start without user
        phoneNumber: '+61473164581',
        user: null,
        business: { id: testBusinessId, name: 'Test Business', email: 'test@example.com', phone_number: '+61473164581', address: 'Test Address' } as Business
      });

      // 5. Simulate user identification during call (using application user ID)
      await voiceEventBus.publish({
        type: 'voice:user:resolved',
        callId: testCallId,
        timestamp: Date.now(),
        data: { user: { id: testAppUser.id, first_name: testAppUser.first_name, email: testAppUser.email } }
      });

      // 6. Add conversation messages
      await contextManager.addUserMessage(testCallId, 'Hi, I need help with my project');
      await contextManager.addAssistantMessage(testCallId, 'Hello! I\'d be happy to help. What kind of project are you working on?');
      await contextManager.addUserMessage(testCallId, 'I need a quote for landscaping my backyard');
      await contextManager.addAssistantMessage(testCallId, 'Great! I can connect you with landscaping professionals. What\'s the size of your backyard?');
      await contextManager.addUserMessage(testCallId, 'It\'s about 200 square meters');
      await contextManager.addAssistantMessage(testCallId, 'Perfect! Let me find available landscapers in your area.');

      // 7. Verify conversation exists in Redis
      const messages = await contextManager.getRecentMessages(testCallId);
      expect(messages.length).toBe(6);
      expect(messages[0].content).toBe('Hi, I need help with my project');
      expect(messages[5].content).toBe('Perfect! Let me find available landscapers in your area.');

      // 8. End call to trigger persistence
      await contextManager.endCall(testCallId, 'customer_completed');

      // 9. Wait for persistence to complete (increased timeout)
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 10. Verify persistence event was received
      if (!conversationPersistedEventReceived) {
        console.error(`❌ Persistence event not received for ${testCallId} after 5 seconds`);
      }
      expect(conversationPersistedEventReceived).toBe(true);

      console.log('✅ Conversation persistence test PASSED');

    } finally {
      // Clean up this test's call
      try {
        await contextManager.endCall(testCallId, 'test_cleanup');
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch {
        // Ignore cleanup errors
      }
    }
  }, 20000); // Increase timeout to 20 seconds for database operations
});
