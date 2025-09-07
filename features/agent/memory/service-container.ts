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
import { VoiceEventBus, createVoiceEventBus } from './redis/event-bus';
import { CallContextManager } from './call-context-manager';

export class AgentServiceContainer {
  private static instance: AgentServiceContainer | null = null;

  // Shared services (stateless, handle multiple calls)
  private conversationPersistenceService: ConversationPersistenceService | null = null;
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
      return;
    }

    // Create event bus first (singleton)
    this.voiceEventBus = createVoiceEventBus();
    await this.voiceEventBus.initialize();

    // Create shared services with event bus injection
    this.conversationPersistenceService = new ConversationPersistenceService(this.voiceEventBus);

    // Initialize event listeners for shared services (ONCE only)
    this.conversationPersistenceService.initializeEventListeners();

    this.isInitialized = true;
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
    this.isInitialized = false;
    AgentServiceContainer.instance = null;
  }
}

// Export singleton instance
export const agentServiceContainer = AgentServiceContainer.getInstance();
