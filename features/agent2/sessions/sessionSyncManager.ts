import { EventEmitter } from 'events';
import type { Session } from './session';
import { SessionManager } from './sessionManager';
import { RedisSessionManager } from './redisSessionManager';

/**
 * Session Sync Manager - Auto-sync between memory and Redis
 *
 * Tracks session modifications and automatically persists to Redis
 * Zero changes required to existing tools/services
 */
export class SessionSyncManager extends EventEmitter {
  private sessionProxies = new Map<string, Session>();

  constructor(
    private memoryManager: SessionManager,
    private redisManager: RedisSessionManager
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

    // Initial save to Redis
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
   * Remove session from both memory and Redis with business context
   */
  remove(sessionId: string, businessId?: string): void {
    const session = this.memoryManager.get(sessionId);
    const actualBusinessId = businessId || session?.businessId;

    this.memoryManager.remove(sessionId);
    this.sessionProxies.delete(sessionId);

    // Only delete from Redis if we have business context
    if (actualBusinessId) {
      this.redisManager.deleteSession(sessionId, actualBusinessId);
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
          'quotes', 'selectedQuote', 'selectedQuoteRequest',
          'conversationState', 'customerEntity', 'customerId',
          'interactions', 'tokenUsage', 'status'
        ];

        if (syncProperties.includes(String(property))) {
          // Async save (don't block the tool)
          syncManager.redisManager.saveSession(target).catch(error => {
            console.error(`❌ [SessionSync] Auto-save failed for ${target.id}:`, error);
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
   * Manual save for critical operations
   */
  async forceSave(sessionId: string): Promise<void> {
    const session = this.memoryManager.get(sessionId);
    if (session) {
      await this.redisManager.saveSession(session);
    }
  }

}

// Create the sync-enabled session manager
const memoryManager = new SessionManager();
const redisManager = new RedisSessionManager();
export const sessionSyncManager = new SessionSyncManager(memoryManager, redisManager);
