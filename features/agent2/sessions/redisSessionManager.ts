import { VoiceRedisClient } from '../../agent/memory/redis/redis-client';
import type { Session } from './session';

// Create Redis client instance for sessions
const redisClient = new VoiceRedisClient();

/**
 * Simple Redis Session Manager - only what we need for current tools
 *
 * Operations based on current tool usage:
 * - Save/load complete sessions
 * - Track session state changes
 */
export class RedisSessionManager {
  private readonly KEY_PREFIX = 'agent2:session:';
  private readonly TTL_SECONDS = 3600; // 1 hour session TTL

  /**
   * Save complete session to Redis with business namespacing
   */
  async saveSession(session: Session): Promise<void> {
    try {
      const key = this.getSessionKey(session);
      const sessionData = JSON.stringify(session);
      await redisClient.set(key, sessionData, this.TTL_SECONDS);
    } catch (error) {
      console.error(`❌ [RedisSessionManager] Failed to save session ${session.id}:`, error);
      // Don't throw - let app continue with memory-only session
    }
  }

  /**
   * Load session from Redis
   */
  async loadSession(sessionId: string, businessId: string): Promise<Session | null> {
    try {
      const key = this.getBusinessSessionKey(businessId, sessionId);
      const sessionData = await redisClient.get(key);

      if (!sessionData) {
        return null;
      }

      return JSON.parse(sessionData) as Session;
    } catch (error) {
      console.error(`❌ [RedisSessionManager] Failed to load session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Delete session from Redis
   */
  async deleteSession(sessionId: string, businessId: string): Promise<void> {
    try {
      const key = this.getBusinessSessionKey(businessId, sessionId);
      await redisClient.del(key);
    } catch (error) {
      console.error(`❌ [RedisSessionManager] Failed to delete session ${sessionId}:`, error);
      // Don't throw - session cleanup is not critical
    }
  }

  /**
   * Check if session exists in Redis
   */
  async sessionExists(sessionId: string, businessId: string): Promise<boolean> {
    try {
      const key = this.getBusinessSessionKey(businessId, sessionId);
      const exists = await redisClient.exists(key);
      return exists === 1;
    } catch (error) {
      console.error(`❌ [RedisSessionManager] Failed to check session existence ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Extend session TTL (useful for active sessions)
   */
  async extendSessionTTL(sessionId: string, businessId: string, ttlSeconds: number = this.TTL_SECONDS): Promise<void> {
    try {
      const key = this.getBusinessSessionKey(businessId, sessionId);
      await redisClient.expire(key, ttlSeconds);
    } catch (error) {
      console.error(`❌ [RedisSessionManager] Failed to extend TTL for session ${sessionId}:`, error);
    }
  }

  /**
   * Get business-namespaced session key (preferred)
   */
  private getSessionKey(session: Session): string {
    return `agent2:business:${session.businessId}:session:${session.id}`;
  }

  /**
   * Get business-namespaced session key by IDs
   */
  private getBusinessSessionKey(businessId: string, sessionId: string): string {
    return `agent2:business:${businessId}:session:${sessionId}`;
  }

}

// Singleton instance
export const redisSessionManager = new RedisSessionManager();
