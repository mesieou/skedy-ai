/**
 * Service Container for Agent Memory System
 *
 * Enterprise dependency injection pattern:
 * - Single instances of shared services
 * - Proper dependency management
 * - Clear service lifecycle
 * - Testable and scalable
 */

import { ConversationPersistenceService } from './long-term/conversation-persistence';
import { CallStateManager } from './short-term/call-state-manager';
import { RealTimeConversationManager } from './short-term/conversation-manager';
import { UserCreationService } from '../tools/user-creation';

export class AgentServiceContainer {
  private static instance: AgentServiceContainer | null = null;

  // Shared services (stateless, handle multiple calls)
  private conversationPersistenceService: ConversationPersistenceService | null = null;
  private userCreationService: UserCreationService | null = null;

  private isInitialized = false;

  private constructor() {}

  static getInstance(): AgentServiceContainer {
    if (!AgentServiceContainer.instance) {
      AgentServiceContainer.instance = new AgentServiceContainer();
    }
    return AgentServiceContainer.instance;
  }

  /**
   * Initialize all shared services and their event listeners
   * Call this ONCE during application startup
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('📦 [ServiceContainer] Already initialized');
      return;
    }

    console.log('📦 [ServiceContainer] Initializing agent services...');

    // Create shared services (handle multiple calls)
    this.conversationPersistenceService = new ConversationPersistenceService();
    this.userCreationService = new UserCreationService();

    // Initialize event listeners for shared services (ONCE only)
    this.conversationPersistenceService.initializeEventListeners();
    this.userCreationService.initializeEventListeners();

    this.isInitialized = true;
    console.log('✅ [ServiceContainer] Agent services initialized');
  }

  /**
   * Get shared services (stateless, handle multiple calls)
   */
  getConversationPersistenceService(): ConversationPersistenceService {
    if (!this.conversationPersistenceService) {
      throw new Error('ServiceContainer not initialized. Call initialize() first.');
    }
    return this.conversationPersistenceService;
  }

  getUserCreationService(): UserCreationService {
    if (!this.userCreationService) {
      throw new Error('ServiceContainer not initialized. Call initialize() first.');
    }
    return this.userCreationService;
  }

  /**
   * Create new instances of stateful services (per-call services)
   */
  createCallStateManager(): CallStateManager {
    return new CallStateManager();
  }

  createRealTimeConversationManager(): RealTimeConversationManager {
    return new RealTimeConversationManager();
  }

  /**
   * Check if container is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Reset for testing (use only in tests)
   */
  reset(): void {
    this.conversationPersistenceService = null;
    this.userCreationService = null;
    this.isInitialized = false;
    AgentServiceContainer.instance = null;
    console.log('🧪 [ServiceContainer] Reset for testing');
  }
}

// Export singleton instance
export const agentServiceContainer = AgentServiceContainer.getInstance();
