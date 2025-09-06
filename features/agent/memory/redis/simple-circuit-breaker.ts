/**
 * Simple Circuit Breaker
 *
 * MVP circuit breaker for Redis operations:
 * - Fails fast when Redis is down
 * - Automatic fallback to Postgres
 * - Simple state tracking (open/closed)
 * - Reset after successful operations
 */

export enum CircuitState {
  CLOSED = 'closed',   // Normal operation
  OPEN = 'open',       // Failing - use fallback
  HALF_OPEN = 'half_open' // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  monitoringWindowMs: number;
}

export class SimpleCircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private config: CircuitBreakerConfig;

  constructor() {
    this.config = {
      failureThreshold: parseInt(process.env.REDIS_CIRCUIT_BREAKER_THRESHOLD || '3'),
      resetTimeoutMs: parseInt(process.env.REDIS_CIRCUIT_BREAKER_RESET_MS || '30000'), // 30 seconds
      monitoringWindowMs: parseInt(process.env.REDIS_CIRCUIT_BREAKER_WINDOW_MS || '60000') // 1 minute
    };
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        console.log('🔄 [CircuitBreaker] Attempting to reset - testing Redis');
      } else {
        console.log('🚫 [CircuitBreaker] Circuit OPEN - using fallback');
        return await fallback();
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      console.log(`🚫 [CircuitBreaker] Operation failed - using fallback. State: ${this.state}`, error);
      return await fallback();
    }
  }

  /**
   * Record successful operation
   */
  private onSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }

  /**
   * Record failed operation
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.log(`🚫 [CircuitBreaker] Circuit OPENED after ${this.failureCount} failures`);
    }
  }

  /**
   * Check if we should attempt to reset the circuit
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.resetTimeoutMs;
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit statistics
   */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    lastFailureTime: number;
    timeSinceLastFailure: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      timeSinceLastFailure: Date.now() - this.lastFailureTime
    };
  }

  /**
   * Force reset the circuit (for testing or manual recovery)
   */
  forceReset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    console.log('🔄 [CircuitBreaker] Manually reset to CLOSED state');
  }
}

// Singleton instance
export const simpleCircuitBreaker = new SimpleCircuitBreaker();
