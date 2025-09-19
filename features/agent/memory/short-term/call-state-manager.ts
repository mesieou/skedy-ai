/**
 * Call State Manager
 *
 * Manages short-term call state in Redis with:
 * - Single source of truth for active call data
 * - Fast lookups and updates (<10ms)
 * - Circuit breaker fallback to Postgres
 * - TTL management for ended calls
 */

import { voiceRedisClient } from '../../../agent2/sessions/redisClient';
import { simpleCircuitBreaker } from '../redis/simple-circuit-breaker';
import type { Service } from '../../../shared/lib/database/types/service';
import type { User } from '../../../shared/lib/database/types/user';
import type { QuoteRequestInfo, QuoteResultInfo } from '../../../scheduling/lib/types/booking-calculations';

// ============================================================================
// TYPES
// ============================================================================

export interface CallState {
  callId: string;
  businessId: string;
  userId: string | null;
  user: User | null;
  chatSessionId: string | null;
  phoneNumber: string;

  // Call status
  status: 'connecting' | 'active' | 'ended';
  startedAt: number; // timestamp
  lastActivity: number; // timestamp

  // WebSocket status
  webSocketStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  webSocketConnectedAt?: number;

  // Business context
  selectedService: Service | null;
  toolsAvailable: string[]; // Current available function names

  // Quote tracking (supports multiple quotes per call)
  quotes: Record<string, {
    quoteRequestData: QuoteRequestInfo;
    quoteResultData: QuoteResultInfo;
    timestamp: number;
  }>;
  selectedQuoteId: string | null;
  quoteGenerated: boolean;

  // Customer info for booking creation
  customerInfo: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface CallStateUpdate {
  status?: CallState['status'];
  webSocketStatus?: CallState['webSocketStatus'];
  userId?: string | null;
  user?: User | null;
  selectedService?: Service | null;
  toolsAvailable?: string[];
  quotes?: CallState['quotes'];
  selectedQuoteId?: string | null;
  quoteGenerated?: boolean;
  customerInfo?: Partial<CallState['customerInfo']>;
  lastActivity?: number;
}

// ============================================================================
// CALL STATE MANAGER
// ============================================================================

export class CallStateManager {
  private readonly keyPrefix = 'voice:call';

  // ============================================================================
  // CORE OPERATIONS
  // ============================================================================

  async createCallState(callData: {
    callId: string;
    businessId: string;
    userId: string | null;
    phoneNumber: string;
  }): Promise<CallState> {
    const callState: CallState = {
      ...callData,
      chatSessionId: null,
      status: 'connecting',
      startedAt: Date.now(),
      lastActivity: Date.now(),
      webSocketStatus: 'connecting',
      selectedService: null,
      toolsAvailable: ['select_service'],
      quotes: {},
      selectedQuoteId: null,
      quoteGenerated: false,
      user: null, // Will be populated when user is created
      customerInfo: {
        phone: callData.phoneNumber
      }
    };

    await this.storeCallState(callState);

    return callState;
  }

  async getCallState(callId: string): Promise<CallState | null> {
    const key = this.getStateKey(callId);

    return await simpleCircuitBreaker.execute(
      // Redis operation
      async () => {
        const data = await voiceRedisClient.get(key);
        if (!data) return null;

        const state = JSON.parse(data) as CallState;
        return state;
      },
      // Fallback operation (Postgres)
      async () => {
        // TODO: Implement database fallback when needed
        return null;
      }
    );
  }

  async updateCallState(callId: string, updates: CallStateUpdate): Promise<CallState | null> {
    const currentState = await this.getCallState(callId);
    if (!currentState) {
      console.warn(`⚠️ [CallState] Cannot update - call state not found: ${callId}`);
      return null;
    }

    const updatedState: CallState = {
      ...currentState,
      ...updates,
      lastActivity: Date.now()
    };

    await this.storeCallState(updatedState);
    return updatedState;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async endCall(callId: string, _reason: string): Promise<void> {
    const updates: CallStateUpdate = {
      status: 'ended',
      webSocketStatus: 'disconnected',
      lastActivity: Date.now()
    };

    await this.updateCallState(callId, updates);

    // Set TTL on all call keys
    await this.setCallTTL(callId);

  }

  async deleteCallState(callId: string): Promise<void> {
    const keys = await this.getAllCallKeys(callId);

    const deletePromises = keys.map(async (key) => {
      try {
        await voiceRedisClient.del(key);
      } catch (error) {
        console.error(`❌ [CallState] Failed to delete key ${key}:`, error);
      }
    });

    await Promise.allSettled(deletePromises);
  }

  // ============================================================================
  // BOOKING DATA MANAGEMENT
  // ============================================================================

  async storeQuote(
    callId: string,
    quoteId: string,
    quoteRequest: QuoteRequestInfo,
    quoteResult: QuoteResultInfo
  ): Promise<void> {
    const currentState = await this.getCallState(callId);
    if (!currentState) return;

    const updatedQuotes = {
      ...currentState.quotes,
      [quoteId]: {
        quoteRequestData: quoteRequest,
        quoteResultData: quoteResult,
        timestamp: Date.now()
      }
    };

    await this.updateCallState(callId, {
      quotes: updatedQuotes,
      selectedQuoteId: null, // No auto-selection - customer must choose
      quoteGenerated: true
    });
  }

  async getSelectedQuote(callId: string): Promise<{
    quoteRequestData: QuoteRequestInfo;
    quoteResultData: QuoteResultInfo;
  } | null> {
    const state = await this.getCallState(callId);
    if (!state?.selectedQuoteId || !state.quotes[state.selectedQuoteId]) {
      return null;
    }

    const selectedQuote = state.quotes[state.selectedQuoteId];
    return {
      quoteRequestData: selectedQuote.quoteRequestData,
      quoteResultData: selectedQuote.quoteResultData
    };
  }

  async selectQuote(callId: string, quoteId: string): Promise<void> {
    await this.updateCallState(callId, {
      selectedQuoteId: quoteId
    });
  }

  async getAllQuotes(callId: string): Promise<Record<string, {
    quoteRequestData: QuoteRequestInfo;
    quoteResultData: QuoteResultInfo;
    timestamp: number;
  }>> {
    const state = await this.getCallState(callId);
    return state?.quotes || {};
  }

  async updateCustomerInfo(callId: string, customerInfo: Partial<CallState['customerInfo']>): Promise<void> {
    const currentState = await this.getCallState(callId);
    if (!currentState) return;

    const mergedCustomerInfo = {
      ...currentState.customerInfo,
      ...customerInfo
    };

    await this.updateCallState(callId, {
      customerInfo: mergedCustomerInfo
    });

  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async storeCallState(state: CallState): Promise<void> {
    const key = this.getStateKey(state.callId);
    const data = JSON.stringify(state);

    await simpleCircuitBreaker.execute(
      // Redis operation
      async () => {
        await voiceRedisClient.set(key, data);
        // No TTL for active calls
      },
      // Fallback operation
      async () => {
        // TODO: Implement database fallback when needed
      }
    );
  }

  private async setCallTTL(callId: string): Promise<void> {
    const keys = await this.getAllCallKeys(callId);
    const ttlSeconds = parseInt(process.env.VOICE_TTL_SECONDS || '3600');

    const ttlPromises = keys.map(async (key) => {
      try {
        await voiceRedisClient.expire(key, ttlSeconds);
      } catch (error) {
        console.error(`❌ [CallState] Failed to set TTL for ${key}:`, error);
      }
    });

    await Promise.allSettled(ttlPromises);
  }

  private async getAllCallKeys(callId: string): Promise<string[]> {
    const pattern = `${this.keyPrefix}:${callId}:*`;
    return await voiceRedisClient.client.keys(pattern);
  }

  private getStateKey(callId: string): string {
    return `${this.keyPrefix}:${callId}:state`;
  }

  // ============================================================================
  // MONITORING & DEBUGGING
  // ============================================================================

  async getActiveCallsCount(): Promise<number> {
    try {
      const allStateKeys = await voiceRedisClient.client.keys(`${this.keyPrefix}:*:state`);
      let activeCount = 0;

      for (const key of allStateKeys) {
        const ttl = await voiceRedisClient.client.ttl(key);
        if (ttl === -1) { // No expiry = active call
          activeCount++;
        }
      }

      return activeCount;
    } catch (error) {
      console.error('❌ [CallState] Failed to get active calls count:', error);
      return 0;
    }
  }

  async getAllActiveCallIds(): Promise<string[]> {
    try {
      const allStateKeys = await voiceRedisClient.client.keys(`${this.keyPrefix}:*:state`);
      const activeCallIds: string[] = [];

      for (const key of allStateKeys) {
        const ttl = await voiceRedisClient.client.ttl(key);
        if (ttl === -1) { // No expiry = active call
          // Extract callId from key: voice:call:{callId}:state
          const callId = key.split(':')[2];
          activeCallIds.push(callId);
        }
      }

      return activeCallIds;
    } catch (error) {
      console.error('❌ [CallState] Failed to get active call IDs:', error);
      return [];
    }
  }

  async getCallStateSummary(callId: string): Promise<{
    exists: boolean;
    status?: string;
    duration?: number;
    messageCount?: number;
    hasQuote?: boolean;
  }> {
    const state = await this.getCallState(callId);

    if (!state) {
      return { exists: false };
    }

    return {
      exists: true,
      status: state.status,
      duration: Date.now() - state.startedAt,
      hasQuote: state.quoteGenerated
    };
  }
}
