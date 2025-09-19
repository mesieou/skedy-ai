/**
 * Simple TTL Manager
 *
 * MVP TTL management for voice calls:
 * - Active calls: No TTL (stay until ended)
 * - Ended calls: 1 hour TTL for cleanup
 * - Simple, reliable, focused on voice call lifecycle
 */

import { voiceRedisClient } from '../../../agent2/sessions/redisClient';

export class SimpleTTL {
  private defaultTTLSeconds: number;

  constructor() {
    this.defaultTTLSeconds = parseInt(process.env.VOICE_TTL_SECONDS || '3600'); // 1 hour default
  }

  /**
   * Set TTL for ended calls (cleanup after 1 hour)
   */
  async setEndedCallTTL(callId: string): Promise<void> {
    try {
      const keys = await this.getCallKeys(callId);

      if (keys.length > 0) {
        // Set TTL for all call-related keys
        const ttlPromises = keys.map(key => voiceRedisClient.expire(key, this.defaultTTLSeconds));
        await Promise.all(ttlPromises);

        console.log(`⏰ [TTL] Setting TTL=${this.defaultTTLSeconds}s for ${keys.length} keys (call: ${callId})`);
      }
    } catch (error) {
      console.error(`❌ [TTL] Failed to set TTL for call ${callId}:`, error);
    }
  }

  /**
   * Remove TTL for active calls (keep indefinitely until ended)
   */
  async removeCallTTL(callId: string): Promise<void> {
    try {
      const keys = await this.getCallKeys(callId);

      if (keys.length > 0) {
        // Remove TTL (persist indefinitely)
        const persistPromises = keys.map(key => voiceRedisClient.client.persist(key));
        await Promise.all(persistPromises);

        console.log(`♾️ [TTL] Removed TTL for ${keys.length} keys (call: ${callId})`);
      }
    } catch (error) {
      console.error(`❌ [TTL] Failed to remove TTL for call ${callId}:`, error);
    }
  }

  /**
   * Get all Redis keys for a call
   */
  private async getCallKeys(callId: string): Promise<string[]> {
    try {
      // Scan for all keys related to this call
      const patterns = [
        `call:${callId}:*`,
        `conversation:${callId}:*`,
        `state:${callId}`
      ];

      const allKeys: string[] = [];
      for (const pattern of patterns) {
        const keys = await voiceRedisClient.client.keys(pattern);
        allKeys.push(...keys);
      }

      return [...new Set(allKeys)]; // Remove duplicates
    } catch (error) {
      console.error(`❌ [TTL] Failed to get keys for call ${callId}:`, error);
      return [];
    }
  }

  /**
   * Get TTL for a specific key
   */
  async getTTL(key: string): Promise<number> {
    return await voiceRedisClient.client.ttl(key);
  }
}

// Singleton instance
export const simpleTTL = new SimpleTTL();
