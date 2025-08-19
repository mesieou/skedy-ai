import { ChatSessionSeeder } from '../../../lib/database/seeds/chat-session-seeder';
import { UserSeeder } from '../../../lib/database/seeds/user-seeder';
import { BusinessSeeder } from '../../../lib/database/seeds/business-seeder';
import { createUniqueChatSessionData } from '../../../lib/database/seeds/data/chat-sessions-data';
import { createUniqueRemovalistBusinessData } from '../../../lib/database/seeds/data/business-data';
import type { ChatSession } from '../../../lib/database/types/chat-sessions';
import { MessageSenderType, ChatSessionStatus } from '../../../lib/database/types/chat-sessions';
import { DateUtils } from '../../../utils/date-utils';

describe('ChatSessionRepository', () => {
  let chatSessionSeeder: ChatSessionSeeder;
  let userSeeder: UserSeeder;
  let businessSeeder: BusinessSeeder;
  let testSession: ChatSession; // Shared session for all tests

  beforeAll(async () => {
    chatSessionSeeder = new ChatSessionSeeder();
    userSeeder = new UserSeeder();
    businessSeeder = new BusinessSeeder();
    
    // Cleanup first
    await chatSessionSeeder.cleanup();
    await userSeeder.cleanup();
    await businessSeeder.cleanup();
    
    // Create dependencies and ONE session for all tests
    const business = await businessSeeder.createBusinessWith(createUniqueRemovalistBusinessData());
    const user = await userSeeder.createUniqueCustomerUser(business.id);
    const sessionData = createUniqueChatSessionData(user.id, business.id);
    testSession = await chatSessionSeeder.create(sessionData);
  });

  afterAll(async () => {
    await chatSessionSeeder.cleanup();
    await userSeeder.cleanup();
    await businessSeeder.cleanup();
  });

  describe('CRUD operations', () => {
    it('should create a chat session', async () => {
      expect(testSession).toBeDefined();
      expect(testSession.id).toBeDefined();
      expect(testSession.status).toBe(ChatSessionStatus.ACTIVE);
      expect(testSession.ended_at).toBeNull();
      expect(testSession.all_messages).toEqual([]);
    });

    it('should find chat session by user_id', async () => {
      const foundSession = await chatSessionSeeder.findOne({ 
        user_id: testSession.user_id 
      });

      expect(foundSession).toBeDefined();
      expect(foundSession?.id).toBe(testSession.id);
      expect(foundSession?.user_id).toBe(testSession.user_id);
      expect(foundSession?.business_id).toBe(testSession.business_id);
    });

    it('should update a chat session', async () => {
      const updatedStatus = ChatSessionStatus.ENDED;
      const updatedSession = await chatSessionSeeder.updateOne(
        { id: testSession.id },
        { 
          status: updatedStatus,
          ended_at: DateUtils.nowUTC()
        }
      );

      expect(updatedSession.status).toBe(updatedStatus);
      expect(updatedSession.ended_at).toBeDefined();
      expect(updatedSession.id).toBe(testSession.id);
      expect(updatedSession.user_id).toBe(testSession.user_id);
      
      // Reset status back for other tests
      await chatSessionSeeder.updateOne(
        { id: testSession.id }, 
        { 
          status: testSession.status,
          ended_at: null
        }
      );
    });

    it('should return null when chat session not found', async () => {
      const nonExistentSession = await chatSessionSeeder.findOne({ 
        user_id: '00000000-0000-0000-0000-000000000000' 
      });

      expect(nonExistentSession).toBeNull();
    });

    it('should delete a chat session by id', async () => {
      // Delete the shared session (run last)
      await chatSessionSeeder.deleteOne({ id: testSession.id });

      const deletedSession = await chatSessionSeeder.findOne({ id: testSession.id });
      expect(deletedSession).toBeNull();
    });
  });

  describe('Message operations', () => {
    let messageTestSession: ChatSession;

    beforeAll(async () => {
      // Create a separate session for message tests since we delete the main one
      const business = await businessSeeder.createBusinessWith(createUniqueRemovalistBusinessData());
      const user = await userSeeder.createUniqueCustomerUser(business.id);
      const sessionData = createUniqueChatSessionData(user.id, business.id);
      messageTestSession = await chatSessionSeeder.create(sessionData);
    });

    it('should add a message to a chat session', async () => {
      const messageData = {
        content: 'Hello, I need help with a removal quote',
        sender_type: MessageSenderType.USER
      };

      await chatSessionSeeder.addMessage(messageTestSession.id, messageData);

      const messageCount = await chatSessionSeeder.getMessageCount(messageTestSession.id);
      expect(messageCount).toBe(1);
    });

    it('should get messages from a chat session', async () => {
      // Add another message
      const messageData = {
        content: 'I can help you with that. Where are you moving from and to?',
        sender_type: MessageSenderType.AGENT
      };

      await chatSessionSeeder.addMessage(messageTestSession.id, messageData);

      const messages = await chatSessionSeeder.getMessages(messageTestSession.id);
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Hello, I need help with a removal quote');
      expect(messages[0].sender_type).toBe(MessageSenderType.USER);
      expect(messages[1].content).toBe('I can help you with that. Where are you moving from and to?');
      expect(messages[1].sender_type).toBe(MessageSenderType.AGENT);
    });

    it('should get correct message count', async () => {
      const messageCount = await chatSessionSeeder.getMessageCount(messageTestSession.id);
      expect(messageCount).toBe(2);
    });

    it('should get messages with limit option', async () => {
      const messages = await chatSessionSeeder.getMessages(messageTestSession.id, { limit: 1 });
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Hello, I need help with a removal quote');
    });

    it('should return empty array for session with no messages', async () => {
      const business = await businessSeeder.createBusinessWith(createUniqueRemovalistBusinessData());
      const user = await userSeeder.createUniqueCustomerUser(business.id);
      const sessionData = createUniqueChatSessionData(user.id, business.id);
      const emptySession = await chatSessionSeeder.create(sessionData);
      
      const messages = await chatSessionSeeder.getMessages(emptySession.id);
      expect(messages).toEqual([]);
      
      const messageCount = await chatSessionSeeder.getMessageCount(emptySession.id);
      expect(messageCount).toBe(0);
    });
  });
});
