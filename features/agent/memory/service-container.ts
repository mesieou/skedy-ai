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
import { VoiceEventBus, createVoiceEventBus } from './redis/event-bus';
import { CallContextManager } from './call-context-manager';

export class AgentServiceContainer {
  private static instance: AgentServiceContainer | null = null;

  // Shared services (stateless, handle multiple calls)
  private conversationPersistenceService: ConversationPersistenceService | null = null;
  private userCreationService: UserCreationService | null = null;
  private voiceEventBus: VoiceEventBus | null = null;

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

    // Create event bus first (singleton)
    this.voiceEventBus = createVoiceEventBus();
    await this.voiceEventBus.initialize();

    // Create shared services with event bus injection
    this.conversationPersistenceService = new ConversationPersistenceService(this.voiceEventBus);
    this.userCreationService = new UserCreationService(this.voiceEventBus);

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

  getVoiceEventBus(): VoiceEventBus {
    if (!this.voiceEventBus) {
      throw new Error('ServiceContainer not initialized. Call initialize() first.');
    }
    return this.voiceEventBus;
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

  createCallContextManager(): CallContextManager {
    if (!this.voiceEventBus) {
      throw new Error('ServiceContainer not initialized. Call initialize() first.');
    }
    return new CallContextManager(this.voiceEventBus);
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
