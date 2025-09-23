/**
 * Persist Session and Interactions Handler
 *
 * Persists final session state and interactions to database
 * Maps from agent2 session to database chat_sessions and interactions tables
 */

import { sentry } from "@/features/shared/utils/sentryService";
import { ChatSessionRepository } from "@/features/shared/lib/database/repositories/chat-session-repository";
import { InteractionsRepository } from "@/features/shared/lib/database/repositories/interactions-repository";
import { ChatChannel, ChatSessionStatus } from "@/features/shared/lib/database/types/chat-sessions";
import { CreateInteractionData } from "@/features/shared/lib/database/types/interactions";
import { DateUtils } from "@/features/shared/utils/date-utils";
import type { Session as AgentSession } from "../../sessions/session";

/**
 * Persist session and interactions to database
 */
export async function persistSessionAndInteractions(session: AgentSession): Promise<void> {
  const startTime = Date.now();

  try {
    console.log(`💾 [PersistSession] Persisting session and interactions for: ${session.id}`);

    // Add breadcrumb for debugging
    sentry.addBreadcrumb(`Persisting session and interactions`, 'database-persist', {
      sessionId: session.id,
      businessId: session.businessId,
      interactionsCount: session.interactions.length
    });

    const chatSessionRepo = new ChatSessionRepository();
    const interactionsRepo = new InteractionsRepository();

    // 1. Create chat session in database (chat_sessions table)
    const sessionData = {
      channel: ChatChannel.PHONE,
      user_id: session.customerId || null,
      business_id: session.businessId,
      status: ChatSessionStatus.ENDED,
      ended_at: DateUtils.nowUTC(),
      token_spent: {
        ...session.tokenUsage,
        lastUpdated: new Date().getTime() // UTC timestamp in milliseconds
      }
    };

    console.log(`🗃️ [PersistSession] Creating chat session for business: ${session.businessId}, user: ${session.customerId || 'anonymous'}`);

    const chatSession = await chatSessionRepo.create(sessionData);
    console.log(`✅ [PersistSession] Created chat session: ${chatSession.id}`);

    // 2. Create interactions in database (interactions table)
    if (session.interactions.length > 0) {
      console.log(`📝 [PersistSession] Creating ${session.interactions.length} interactions`);

      for (const interaction of session.interactions) {
        // Use the interaction data as-is, just update the session_id to link to database
        const interactionData: CreateInteractionData = {
          ...interaction,
          session_id: chatSession.id, // Link to the chat session we just created
          business_id: session.businessId,
          user_id: session.customerId || null
        };

        await interactionsRepo.create(interactionData);
      }

      console.log(`✅ [PersistSession] Created ${session.interactions.length} interactions`);
    } else {
      console.log(`📭 [PersistSession] No interactions to persist`);
    }

    const duration = Date.now() - startTime;
    console.log(`🎯 [PersistSession] Session persistence complete (${duration}ms)`);

    // Success breadcrumb
    sentry.addBreadcrumb(`Session persistence complete`, 'database-persist', {
      sessionId: session.id,
      chatSessionId: chatSession.id,
      interactionsCount: session.interactions.length,
      duration
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [PersistSession] Failed to persist session ${session.id}:`, error);

    // Track error in Sentry
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'persist_session_and_interactions',
      metadata: {
        duration,
        interactionsCount: session.interactions.length,
        hasCustomerId: !!session.customerId,
        hasTokenUsage: !!session.tokenUsage
      }
    });

    throw error; // Re-throw so caller can handle
  }
}
