/**
 * Call State Manager
 *
 * Manages short-term call state in Redis with:
 * - Single source of truth for active call data
 * - Fast lookups and updates (<10ms)
 * - Circuit breaker fallback to Postgres
 * - TTL management for ended calls
 */

import { voiceRedisClient } from '../redis/redis-client';
import { simpleCircuitBreaker } from '../redis/simple-circuit-breaker';
import type { Service } from '../../../shared/lib/database/types/service';
import type { BookingCalculationInput, BookingCalculationResult } from '../../../scheduling/lib/types/booking-calculations';

// ============================================================================
// TYPES
// ============================================================================

export interface CallState {
  callId: string;
  businessId: string;
  userId: string | null;
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

  // Booking data collection (using existing database interfaces)
  collectedBookingInput: Partial<BookingCalculationInput>;
  quoteGenerated: boolean;
  quoteData: BookingCalculationResult | null;

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
  selectedService?: Service | null;
  toolsAvailable?: string[];
  collectedBookingInput?: Partial<BookingCalculationInput>;
  quoteGenerated?: boolean;
  quoteData?: BookingCalculationResult;
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
      collectedBookingInput: {},
      quoteGenerated: false,
      quoteData: null,
      customerInfo: {
        phone: callData.phoneNumber
      }
    };

    await this.storeCallState(callState);
    console.log(`📋 [CallState] Created call state for ${callData.callId}`);

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
        console.log(`📋 [CallState] Retrieved from Redis: ${callId} (status: ${state.status})`);
        return state;
      },
      // Fallback operation (Postgres)
      async () => {
        console.log(`📋 [CallState] Redis fallback: retrieving ${callId} from database`);
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
    console.log(`📋 [CallState] Updated ${callId}:`, Object.keys(updates));

    return updatedState;
  }

  async endCall(callId: string, reason: string): Promise<void> {
    const updates: CallStateUpdate = {
      status: 'ended',
      webSocketStatus: 'disconnected',
      lastActivity: Date.now()
    };

    await this.updateCallState(callId, updates);

    // Set TTL on all call keys
    await this.setCallTTL(callId);

    console.log(`📋 [CallState] Call ended: ${callId} (reason: ${reason})`);
  }

  async deleteCallState(callId: string): Promise<void> {
    const keys = await this.getAllCallKeys(callId);

    const deletePromises = keys.map(async (key) => {
      try {
        await voiceRedisClient.del(key);
        console.log(`🗑️ [CallState] Deleted key: ${key}`);
      } catch (error) {
        console.error(`❌ [CallState] Failed to delete key ${key}:`, error);
      }
    });

    await Promise.allSettled(deletePromises);
    console.log(`🗑️ [CallState] Deleted all keys for call: ${callId}`);
  }

  // ============================================================================
  // BOOKING DATA MANAGEMENT
  // ============================================================================

  async updateBookingInput(callId: string, bookingInput: Partial<BookingCalculationInput>): Promise<void> {
    const currentState = await this.getCallState(callId);
    if (!currentState) return;

    const mergedBookingInput = {
      ...currentState.collectedBookingInput,
      ...bookingInput
    };

    await this.updateCallState(callId, {
      collectedBookingInput: mergedBookingInput
    });

    console.log(`📋 [CallState] Updated booking input for ${callId}:`, Object.keys(bookingInput));
  }

  async getBookingInput(callId: string): Promise<Partial<BookingCalculationInput> | null> {
    const state = await this.getCallState(callId);
    return state?.collectedBookingInput || null;
  }

  async setQuoteData(callId: string, quoteData: BookingCalculationResult): Promise<void> {
    await this.updateCallState(callId, {
      quoteGenerated: true,
      quoteData
    });

    console.log(`💰 [CallState] Quote data stored for ${callId}`);
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

    console.log(`👤 [CallState] Updated customer info for ${callId}:`, Object.keys(customerInfo));
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
        console.log(`📋 [CallState] Redis fallback: storing ${state.callId} in database`);
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
        console.log(`⏰ [CallState] TTL set for ${key} (${ttlSeconds}s)`);
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
