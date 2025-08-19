// Chat session seeder
import { BaseSeeder } from './base-seeder';
import { ChatSessionRepository } from '../repositories/chat-session-repository';
import type { ChatSession, CreateChatMessageData, ChatMessage } from '../types/chat-sessions';

export class ChatSessionSeeder extends BaseSeeder<ChatSession> {
  constructor() {
    super(new ChatSessionRepository());
  }
  //add message
  async addMessage(sessionId: string, message: CreateChatMessageData): Promise<void> {
    const repository = this.repository as ChatSessionRepository;
    await repository.addMessage(sessionId, message);
  }

  //get messages
  async getMessages(sessionId: string, options?: import('../types/base').QueryOptions): Promise<ChatMessage[]> {
    const repository = this.repository as ChatSessionRepository;
    return await repository.getMessages(sessionId, options);
  }

  //get message count
  async getMessageCount(sessionId: string): Promise<number> {
    const repository = this.repository as ChatSessionRepository;
    return await repository.getMessageCount(sessionId);
  }
}
