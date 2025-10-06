import { EventEmitter } from 'events';
import type { Session } from './session';
import { SessionManager } from './sessionManager';
import { redisSessionManager } from './redisClient';
import { sentry } from '@/features/shared/utils/sentryService';

/**
 * Session Sync Manager - Auto-sync between memory and Redis
 *
 * Tracks session modifications and automatically persists to Redis
 * Zero changes required to existing tools/services
 */
export class SessionSyncManager extends EventEmitter {
  private sessionProxies = new Map<string, Session>();
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  constructor(
    private memoryManager: SessionManager,
    private redisManager: typeof redisSessionManager
  ) {
    super();
    this.setupSessionRecovery();
  }

  /**
   * Add session with auto-sync - replaces sessionManager.add()
   */
  add(session: Session): void {
    // Create proxy that auto-saves on property changes
    const proxiedSession = this.createAutoSyncProxy(session);

    // Add to memory manager
    this.memoryManager.add(proxiedSession);

    // Store proxy reference
    this.sessionProxies.set(session.id, proxiedSession);

    // Add breadcrumb for session creation
    sentry.addBreadcrumb(`Session added to sync manager`, 'session-sync', {
      sessionId: session.id,
      businessId: session.businessId,
      status: session.status
    });

    // Initial save to Redis (full session)
    this.redisManager.saveSession(session);

  }

  /**
   * Get session - tries memory first, Redis fallback with business context
   */
  async get(sessionId: string, businessId?: string): Promise<Session | undefined> {
    // Try memory first
    const session = this.memoryManager.get(sessionId);

    if (session) {
      // Extend TTL for active sessions using business context
      this.redisManager.extendSessionTTL(sessionId, session.businessId);
      return session;
    }

    // Fallback to Redis with business context (only if businessId provided)
    if (businessId) {
      const recoveredSession = await this.redisManager.loadSession(sessionId, businessId);
      if (recoveredSession !== null) {
        this.add(recoveredSession); // Re-add with auto-sync
        return this.memoryManager.get(sessionId);
      }
    }

    return undefined;
  }

  /**
   * Remove session from both memory and Redis with business context and proper cleanup
   */
  remove(sessionId: string, businessId?: string): void {
    const session = this.memoryManager.get(sessionId);
    const actualBusinessId = businessId || session?.businessId;

    // Remove from memory
    this.memoryManager.remove(sessionId);

    // Clean up proxy reference to prevent memory leaks
    this.sessionProxies.delete(sessionId);

    // Add breadcrumb for session removal
    sentry.addBreadcrumb(`Session removed from sync manager`, 'session-sync', {
      sessionId: sessionId,
      businessId: actualBusinessId,
      hadProxyReference: this.sessionProxies.has(sessionId)
    });

    // Only delete from Redis if we have business context
    if (actualBusinessId) {
      this.redisManager.deleteSession(sessionId, actualBusinessId).catch(error => {
        console.error(`❌ [SessionSync] Failed to delete session ${sessionId} from Redis:`, error);

        // Track Redis cleanup failure in Sentry
        sentry.trackError(error as Error, {
          sessionId: sessionId,
          businessId: actualBusinessId,
          operation: 'session_sync_redis_cleanup',
          metadata: {
            operation: 'delete_session_on_remove'
          }
        });

        // Continue despite Redis cleanup failure
      });
    }
  }

  /**
   * List sessions from memory
   */
  list(): Session[] {
    return this.memoryManager.list();
  }

  /**
   * Create a proxy that auto-saves to Redis when session properties change
   * Uses field-specific updates for better performance
   */
  private createAutoSyncProxy(session: Session): Session {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const syncManager = this;

    return new Proxy(session, {
      set(target: Session, property: string | symbol, value: unknown): boolean {
        // Set the value (using unknown cast to bypass type checking for dynamic property assignment)
        (target as unknown as Record<string | symbol, unknown>)[property] = value;

        // Auto-save to Redis for key properties that tools modify
        const syncProperties = [
          'quotes', 'selectedQuote',
          'customerEntity', 'customerId', 'currentTools',
          'interactions', 'tokenUsage', 'status', 'depositPaymentState',
          'pendingCustomerInput', 'pendingToolExecution', 'aiInstructions'
        ];

        if (syncProperties.includes(String(property))) {
          // Use field-specific update for better performance with retry logic
          syncManager.retryOperation(
            () => syncManager.redisManager.updateSessionField(
              target.id,
              target.businessId,
              String(property),
              value
            ),
            `field update for ${target.id}.${String(property)}`
          ).catch(error => {
            console.error(`❌ [SessionSync] Field update failed after retries for ${target.id}.${String(property)}:`, error);

            // Track field update failure in Sentry
            sentry.trackError(error as Error, {
              sessionId: target.id,
              businessId: target.businessId,
              operation: 'session_sync_field_update',
              metadata: {
                fieldName: String(property),
                valueType: typeof value,
                maxRetriesReached: true
              }
            });

            // Note: Memory is already updated, Redis is eventually consistent
          });

          // Auto-cleanup ended sessions from memory after delay
          if (property === 'status' && value === 'ended') {
            setTimeout(() => {
              syncManager.memoryManager.remove(target.id);
              syncManager.sessionProxies.delete(target.id);
            }, 120000); // 2 minutes delay to allow for any final operations
          }
        }

        return true;
      }
    });
  }

  /**
   * Setup session recovery on startup
   */
  private async setupSessionRecovery(): Promise<void> {
    // Sessions are recovered on-demand when accessed
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          console.error(`❌ [SessionSync] ${operationName} failed after ${maxRetries} attempts:`, lastError);

          // Track retry exhaustion in Sentry
          sentry.trackError(lastError, {
            sessionId: 'unknown', // Context not available in generic retry function
            businessId: 'unknown',
            operation: 'session_sync_retry_exhausted',
            metadata: {
              operationName: operationName,
              maxRetries: maxRetries,
              finalAttempt: attempt
            }
          });

          throw lastError;
        }

        const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`⚠️ [SessionSync] ${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, lastError.message);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Manual save for critical operations (still saves full session)
   */
  async forceSave(sessionId: string): Promise<void> {
    const session = this.memoryManager.get(sessionId);
    if (session) {
      await this.redisManager.saveSession(session);
    }
  }

  /**
   * Update multiple session fields efficiently with proper error handling
   */
  async updateFields(sessionId: string, fields: Record<string, unknown>): Promise<void> {
    const session = this.memoryManager.get(sessionId);
    if (!session) {
      console.error(`❌ [SessionSync] Cannot update fields: session ${sessionId} not found in memory`);
      return;
    }

    try {
      // Update Redis first to ensure consistency
      await this.redisManager.updateSessionFields(sessionId, session.businessId, fields);

      // Only update memory after Redis succeeds
      Object.assign(session, fields);
    } catch (error) {
      console.error(`❌ [SessionSync] Failed to update fields for session ${sessionId}:`, error);

      // Track field update failure in Sentry
      sentry.trackError(error as Error, {
        sessionId: sessionId,
        businessId: session.businessId,
        operation: 'session_sync_update_fields',
        metadata: {
          fieldsCount: Object.keys(fields).length,
          fieldNames: Object.keys(fields)
        }
      });

      // Don't update memory if Redis failed
      throw error;
    }
  }

}

// Create and export the session manager
const memoryManager = new SessionManager();
export const sessionManager = new SessionSyncManager(memoryManager, redisSessionManager);
