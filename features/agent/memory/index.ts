/**
 * Agent Memory System
 *
 * Production-ready memory management with:
 * - Redis short-term memory (call state, real-time context)
 * - Postgres long-term persistence (chat sessions, analytics)
 * - Event-driven coordination between memory layers
 * - Circuit breaker fallback strategies
 */

// ============================================================================
// REDIS INFRASTRUCTURE
// ============================================================================
export {
  voiceRedisClient,
  voiceEventBus,
  simpleCircuitBreaker,
  simpleTTL,
  initializeVoiceRedis,
  shutdownVoiceRedis
} from './redis';

export type {
  VoiceEvent,
  EventHandler,
  CallStartedEvent,
  UserResolvedEvent,
  MessageReceivedEvent,
  CallEndedEvent
} from './redis';

// ============================================================================
// SHORT-TERM MEMORY (REDIS)
// ============================================================================
export { CallStateManager } from './short-term/call-state-manager';
export { RealTimeConversationManager } from './short-term/conversation-manager';

export type {
  CallState,
  CallStateUpdate
} from './short-term/call-state-manager';

export type {
  ConversationHistory,
  ConversationMessage
} from './short-term/conversation-manager';

// ============================================================================
// LONG-TERM MEMORY (POSTGRES)
// ============================================================================
export { ConversationPersistenceService } from './long-term/conversation-persistence';

export type {
  VoiceChatSession
} from './long-term/conversation-persistence';

// ============================================================================
// SERVICE CONTAINER (Enterprise DI Pattern)
// ============================================================================
export { agentServiceContainer, AgentServiceContainer } from './service-container';

// ============================================================================
// CALL CONTEXT COORDINATION (NOT Business Context)
// ============================================================================
export { CallContextManager } from './call-context-manager';
export type { CallContext, MessageContext } from './call-context-manager';

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize complete memory system for voice agent
 */
export async function initializeAgentMemory(): Promise<void> {
  console.log('🧠 [Memory] Initializing agent memory system...');

  try {
    // Initialize Redis infrastructure
    const { initializeVoiceRedis, voiceEventBus } = await import('./redis');
    await initializeVoiceRedis();

    // Initialize event bus
    await voiceEventBus.initialize();

    // Initialize service container (shared services)
    const { agentServiceContainer } = await import('./service-container');
    await agentServiceContainer.initialize();

    console.log('✅ [Memory] Agent memory system initialized successfully');

  } catch (error) {
    console.error('❌ [Memory] Failed to initialize agent memory system:', error);
    throw error;
  }
}

/**
 * Shutdown memory system gracefully
 */
export async function shutdownAgentMemory(): Promise<void> {
  console.log('🛑 [Memory] Shutting down agent memory system...');

  try {
    const { shutdownVoiceRedis } = await import('./redis');
    await shutdownVoiceRedis();
    console.log('✅ [Memory] Agent memory system shutdown complete');

  } catch (error) {
    console.error('❌ [Memory] Error during memory system shutdown:', error);
    throw error;
  }
}
