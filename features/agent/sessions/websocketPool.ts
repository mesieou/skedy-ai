import assert from "assert";
import type { Business } from "@/features/shared/lib/database/types/business";
import { BusinessRepository } from "@/features/shared/lib/database/repositories/business-repository";

/**
 * Business-aware WebSocketPool class
 * Maintains pooling logic for potential multiple keys per business
 */
class WebSocketPool {
  private business: Business;
  private apiKeys: string[];
  private counters: number[];

  constructor(business: Business) {
    assert(business, 'WebSocketPool: business is required');
    assert(business.openai_api_key_name, 'WebSocketPool: business must have openai_api_key_name');

    this.business = business;
    // For now, each business has one API key, but structure supports multiple
    const apiKey = BusinessRepository.getApiKeyForBusiness(business);
    this.apiKeys = [apiKey];
    this.counters = [0];
  }

  // Assign the API key with least number of calls for this business
  assign() {
    assert(this.apiKeys.length > 0, 'WebSocketPool.assign: no API keys available');
    const minIndex = this.counters.indexOf(Math.min(...this.counters));
    this.counters[minIndex]++;
    return { apiKey: this.apiKeys[minIndex], index: minIndex };
  }

  // Release the API key after a call is completed
  release(index: number) {
    assert(typeof index === 'number' && index >= 0 && index < this.counters.length, `WebSocketPool.release: invalid index ${index}`);
    assert(this.counters[index] > 0, `WebSocketPool.release: counter for index ${index} is already at zero`);
    this.counters[index]--;
  }

  // Get API key by index
  getApiKeyByIndex(index: number): string {
    assert(typeof index === 'number' && index >= 0 && index < this.apiKeys.length, `WebSocketPool.getApiKeyByIndex: invalid index ${index}`);
    return this.apiKeys[index];
  }
}

// Global pool manager - one pool per business
const businessPools = new Map<string, WebSocketPool>();

/**
 * Get or create a persistent pool for a business
 */
function getPoolForBusiness(business: Business): WebSocketPool {
  const poolKey = business.id; // Use business ID as pool key

  if (!businessPools.has(poolKey)) {
    businessPools.set(poolKey, new WebSocketPool(business));
  }

  return businessPools.get(poolKey)!;
}

/**
 * Simple API key operations - no need to manage pool instances
 */
export const BusinessWebSocketPool = {
  /**
   * Assign API key for a business
   */
  assign(business: Business) {
    const pool = getPoolForBusiness(business);
    return pool.assign();
  },

  /**
   * Release API key for a business
   */
  release(business: Business, index: number) {
    const pool = getPoolForBusiness(business);
    pool.release(index);
  },

  /**
   * Get API key by index for a business
   */
  getApiKeyByIndex(business: Business, index: number): string {
    const pool = getPoolForBusiness(business);
    return pool.getApiKeyByIndex(index);
  }
};
