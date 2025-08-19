import { BaseRepository } from '../base-repository';
import type { 
  ChatSession,
  ChatMessage,
  CreateChatMessageData,
} from '../types/chat-sessions';
import type { QueryOptions } from '../types/base';
import { DateUtils } from '../../../utils/date-utils';

export class ChatSessionRepository extends BaseRepository<ChatSession> {
  constructor() {
    super('chat_sessions');
  }

  // Message operations - work with all_messages JSON column
  async addMessage(sessionId: string, message: CreateChatMessageData): Promise<void> {
    // First get the current session
    const session = await this.findOne({ id: sessionId });
    if (!session) throw new Error(`Session ${sessionId} not found`);
    
    // Add message to all_messages array
    const currentMessages = session.all_messages || [];
    const newMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      session_id: sessionId,
      created_at: DateUtils.nowUTC(),
      updated_at: DateUtils.nowUTC()
    };
    
    const updatedMessages = [...currentMessages, newMessage];
    
    // Update the session with new messages
    await this.updateOne({ id: sessionId }, { all_messages: updatedMessages });
  }

  async getMessages(sessionId: string, options?: QueryOptions): Promise<ChatMessage[]> {
    const session = await this.findOne({ id: sessionId });
    if (!session) return [];
    
    let messages = session.all_messages || [];
    
    if (options?.limit) {
      messages = messages.slice(0, options.limit);
    }
    
    return messages;
  }

  async getMessageCount(sessionId: string): Promise<number> {
    const session = await this.findOne({ id: sessionId });
    if (!session) return 0;
    
    return (session.all_messages || []).length;
  }
}
