/**
 * Postgres Analytics Manager
 *
 * Simple analytics using existing chat_sessions table
 * Much cheaper and simpler than Redis scanning
 */

import { ChatSessionRepository } from '../../shared/lib/database/repositories/chat-session-repository';

export interface AnalyticsSummary {
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  avgTokensPerCall: number;
  avgCostPerCall: number;
  lastUpdated: number;
}

export interface BusinessAnalytics {
  businessId: string;
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
}

export class PostgresAnalyticsManager {
  private chatSessionRepository: ChatSessionRepository;

  constructor() {
    this.chatSessionRepository = new ChatSessionRepository();
  }

  // No update methods needed - token_spent is saved when chat session is persisted

  /**
   * Get overall analytics summary
   */
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    try {
      // Get recent sessions (simple approach)
      const sessions = await this.chatSessionRepository.findAll({
        limit: 1000,
        orderBy: 'created_at',
        ascending: false
      });

      let totalTokens = 0;
      let totalCost = 0;

      const sessionsWithTokens = sessions.filter(s => s.token_spent);

      for (const session of sessionsWithTokens) {
        totalTokens += session.token_spent!.inputTokens + session.token_spent!.outputTokens +
                      session.token_spent!.audioInputTokens + session.token_spent!.audioOutputTokens;
        totalCost += session.token_spent!.totalCost;
      }

      return {
        totalCalls: sessionsWithTokens.length,
        totalTokens,
        totalCost,
        avgTokensPerCall: sessionsWithTokens.length > 0 ? Math.round(totalTokens / sessionsWithTokens.length) : 0,
        avgCostPerCall: sessionsWithTokens.length > 0 ? totalCost / sessionsWithTokens.length : 0,
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('❌ [Analytics] Failed to get summary:', error);
      throw error;
    }
  }

  /**
   * Get analytics by business
   */
  async getBusinessAnalytics(): Promise<BusinessAnalytics[]> {
    try {
      const sessions = await this.chatSessionRepository.findAll({
        limit: 1000,
        orderBy: 'created_at',
        ascending: false
      });

      const businessMap = new Map<string, BusinessAnalytics>();

      for (const session of sessions) {
        if (session.token_spent) {
          const existing = businessMap.get(session.business_id) || {
            businessId: session.business_id,
            totalCalls: 0,
            totalTokens: 0,
            totalCost: 0
          };

          existing.totalCalls++;
          existing.totalTokens += session.token_spent.inputTokens + session.token_spent.outputTokens +
                                  session.token_spent.audioInputTokens + session.token_spent.audioOutputTokens;
          existing.totalCost += session.token_spent.totalCost;

          businessMap.set(session.business_id, existing);
        }
      }

      return Array.from(businessMap.values()).sort((a, b) => b.totalCost - a.totalCost);
    } catch (error) {
      console.error('❌ [Analytics] Failed to get business analytics:', error);
      throw error;
    }
  }

  /**
   * Get recent call analytics
   */
  async getRecentCalls(limit: number = 20): Promise<Array<{
    sessionId: string;
    businessId: string;
    tokens: number;
    cost: number;
    createdAt: string;
  }>> {
    try {
      const sessions = await this.chatSessionRepository.findAll({
        limit,
        orderBy: 'created_at',
        ascending: false
      });

      return sessions
        .filter(session => session.token_spent)
        .map(session => ({
          sessionId: session.id,
          businessId: session.business_id,
          tokens: session.token_spent!.inputTokens + session.token_spent!.outputTokens +
                  session.token_spent!.audioInputTokens + session.token_spent!.audioOutputTokens,
          cost: session.token_spent!.totalCost,
          createdAt: session.created_at || new Date().toISOString()
        }));
    } catch (error) {
      console.error('❌ [Analytics] Failed to get recent calls:', error);
      throw error;
    }
  }
}
