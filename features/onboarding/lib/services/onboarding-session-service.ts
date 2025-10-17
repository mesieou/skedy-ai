import {
  OnboardingSession,
  OnboardingStatus,
  CreateOnboardingSessionParams,
  UpdateOnboardingSessionParams,
  OnboardingInteraction
} from '../types/onboarding-session';
import { v4 as uuidv4 } from 'uuid';
import { ChatSessionRepository } from '@/features/shared/lib/database/repositories/chat-session-repository';
import { InteractionsRepository } from '@/features/shared/lib/database/repositories/interactions-repository';
import { ChatChannel, ChatSessionStatus } from '@/features/shared/lib/database/types/chat-sessions';

/**
 * Onboarding Session Service
 * Manages onboarding session lifecycle and state
 * 
 * Uses existing chat_sessions and interactions tables
 */
export class OnboardingSessionService {
  // In-memory cache for active sessions
  private static sessions = new Map<string, OnboardingSession>();
  private static chatSessionRepo = new ChatSessionRepository();
  private static interactionsRepo = new InteractionsRepository();

  /**
   * Create a new onboarding session
   * Stores in chat_sessions table with onboarding metadata
   */
  static async create(params: CreateOnboardingSessionParams): Promise<OnboardingSession> {
    const sessionId = uuidv4();
    
    const session: OnboardingSession = {
      id: sessionId,
      userId: params.userId,
      status: OnboardingStatus.WEBSITE_INPUT,
      currentStep: 1,
      data: {
        completedSteps: [],
        currentStepData: {}
      },
      interactions: [],
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      channel: params.channel || 'web',
      userAgent: params.userAgent
    };

    // Store in memory cache
    this.sessions.set(sessionId, session);

    // Persist to chat_sessions table
    // We'll use the existing chat_sessions table and store onboarding data in all_messages as metadata
    try {
      const chatSession = await this.chatSessionRepo.create({
        channel: ChatChannel.WEBSITE,
        user_id: params.userId,
        business_id: '', // Will be set after onboarding completes
        status: ChatSessionStatus.ACTIVE,
        all_messages: [{
          type: 'onboarding_metadata',
          status: session.status,
          currentStep: session.currentStep,
          data: session.data,
          startedAt: session.startedAt
        }] as any
      });
      // Update session ID to match database ID
      session.id = chatSession.id;
      this.sessions.delete(sessionId);
      this.sessions.set(chatSession.id, session);
    } catch (error) {
      console.warn(`⚠️ [OnboardingSession] Failed to persist to database:`, error);
      // Continue anyway - in-memory session still works
    }

    console.log(`✅ [OnboardingSession] Created session: ${sessionId} for user: ${params.userId}`);

    return session;
  }

  /**
   * Get an existing session
   */
  static async get(sessionId: string): Promise<OnboardingSession | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      // TODO: Try loading from database
      console.log(`⚠️ [OnboardingSession] Session not found: ${sessionId}`);
      return null;
    }

    return session;
  }

  /**
   * Get or create session for user
   * Returns active session if exists, otherwise creates new one
   */
  static async getOrCreate(userId: string): Promise<OnboardingSession> {
    // Check for active session
    const activeSession = Array.from(this.sessions.values()).find(
      session => session.userId === userId && session.status !== OnboardingStatus.COMPLETED
    );

    if (activeSession) {
      console.log(`🔄 [OnboardingSession] Resuming session: ${activeSession.id}`);
      return activeSession;
    }

    // Create new session
    return this.create({ userId });
  }

  /**
   * Update session
   */
  static async update(
    sessionId: string,
    updates: UpdateOnboardingSessionParams
  ): Promise<OnboardingSession> {
    const session = await this.get(sessionId);
    
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Apply updates
    if (updates.status) {
      session.status = updates.status;
      
      // Track completed steps
      if (!session.data.completedSteps.includes(updates.status)) {
        session.data.completedSteps.push(updates.status);
      }
    }

    if (updates.currentStep !== undefined) {
      session.currentStep = updates.currentStep;
    }

    if (updates.data) {
      session.data = {
        ...session.data,
        ...updates.data
      };
    }

    if (updates.businessId) {
      session.businessId = updates.businessId;
    }

    session.lastActivityAt = Date.now();

    // Update in memory
    this.sessions.set(sessionId, session);

    console.log(`✅ [OnboardingSession] Updated session: ${sessionId}`, {
      status: session.status,
      step: session.currentStep
    });

    // TODO: Persist to database
    // await this.persistToDatabase(session);

    return session;
  }

  /**
   * Add interaction to session
   * Stores in interactions table
   */
  static async addInteraction(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: OnboardingInteraction['metadata']
  ): Promise<OnboardingInteraction> {
    const session = await this.get(sessionId);
    
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const interaction: OnboardingInteraction = {
      id: uuidv4(),
      onboardingSessionId: sessionId,
      role,
      content,
      metadata,
      createdAt: Date.now()
    };

    session.interactions.push(interaction);
    session.lastActivityAt = Date.now();

    // Update in memory
    this.sessions.set(sessionId, session);

    // Persist to interactions table
    try {
      await this.interactionsRepo.create({
        session_id: sessionId,
        business_id: session.businessId || '',
        user_id: session.userId,
        type: 'normal' as any,
        customer_input: role === 'user' ? content : null,
        prompt: role === 'assistant' ? 'Onboarding AI Agent' : '',
        prompt_name: 'onboarding',
        prompt_version: 'v1.0.0',
        model_output: role === 'assistant' ? content : '',
        generated_from_tool_calling: !!metadata?.toolCalls
      });
    } catch (error) {
      console.warn(`⚠️ [OnboardingSession] Failed to persist interaction:`, error);
    }

    console.log(`💬 [OnboardingSession] Added ${role} interaction to session: ${sessionId}`);

    return interaction;
  }

  /**
   * Complete onboarding
   */
  static async complete(sessionId: string): Promise<OnboardingSession> {
    const session = await this.update(sessionId, {
      status: OnboardingStatus.COMPLETED
    });

    session.completedAt = Date.now();
    this.sessions.set(sessionId, session);

    console.log(`🎉 [OnboardingSession] Completed session: ${sessionId}`);

    // TODO: Persist to database
    // await this.persistToDatabase(session);

    return session;
  }

  /**
   * Abandon onboarding
   */
  static async abandon(sessionId: string): Promise<OnboardingSession> {
    return this.update(sessionId, {
      status: OnboardingStatus.ABANDONED
    });
  }

  /**
   * Get all sessions for a user
   */
  static async getUserSessions(userId: string): Promise<OnboardingSession[]> {
    const userSessions = Array.from(this.sessions.values()).filter(
      session => session.userId === userId
    );

    // TODO: Load from database as well
    
    return userSessions;
  }

  /**
   * Delete session (cleanup)
   */
  static async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    console.log(`🗑️ [OnboardingSession] Deleted session: ${sessionId}`);

    // TODO: Delete from database
  }

  /**
   * Get session statistics
   */
  static getStats() {
    const sessions = Array.from(this.sessions.values());
    
    return {
      total: sessions.length,
      active: sessions.filter(s => s.status !== OnboardingStatus.COMPLETED && s.status !== OnboardingStatus.ABANDONED).length,
      completed: sessions.filter(s => s.status === OnboardingStatus.COMPLETED).length,
      abandoned: sessions.filter(s => s.status === OnboardingStatus.ABANDONED).length,
      byStatus: sessions.reduce((acc, session) => {
        acc[session.status] = (acc[session.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  // TODO: Implement database persistence methods
  // private static async persistToDatabase(session: OnboardingSession): Promise<void> {}
  // private static async loadFromDatabase(sessionId: string): Promise<OnboardingSession | null> {}
  // private static async persistInteractionToDatabase(interaction: OnboardingInteraction): Promise<void> {}
}
