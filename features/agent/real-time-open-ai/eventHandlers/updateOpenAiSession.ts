import type { Session } from '../../sessions/session';
import { sentry } from '@/features/shared/utils/sentryService';
import assert from 'assert';
import { createSessionUpdateConfig } from '@/features/shared/lib/openai-realtime-config';

/**
 * Update OpenAI session with current tools
 * Sends session.update message via WebSocket
 */
export async function updateOpenAiSession(session: Session): Promise<void> {
  assert(session.ws, 'WebSocket not available in session');
  assert(session.currentTools && session.currentTools.length > 0, 'Session must have currentTools loaded');

  try {
    console.log(`🔄 [UpdateOpenAI] Updating OpenAI session with ${session.currentTools.length} tools`);

    // Add breadcrumb
    sentry.addBreadcrumb(`Updating OpenAI session tools`, 'openai-session-update', {
      sessionId: session.id,
      businessId: session.businessId,
      toolsCount: session.currentTools.length,
      toolNames: session.currentTools.map(t => t.name)
    });

    // Use tools directly (no transformation needed - schema already in Realtime API format)
    const openAiTools = session.currentTools.map(tool => {
      return tool.function_schema;
    });

    // Create session update message using shared config
    const sessionUpdate = createSessionUpdateConfig(openAiTools);

    // Send to OpenAI
    session.ws.send(JSON.stringify(sessionUpdate));

    console.log(`✅ [UpdateOpenAI] Session updated with tools: ${session.currentTools.map(t => t.name).join(', ')}`);

    // Success breadcrumb
    sentry.addBreadcrumb(`OpenAI session updated successfully`, 'openai-session-update', {
      sessionId: session.id,
      businessId: session.businessId,
      updatedToolsCount: session.currentTools.length
    });

  } catch (error) {
    console.error(`❌ [UpdateOpenAI] Failed to update OpenAI session for ${session.id}:`, error);

    // Track error in Sentry
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'update_openai_session',
      metadata: {
        toolsCount: session.currentTools?.length || 0,
        hasWebSocket: !!session.ws
      }
    });

    throw error; // Re-throw so caller can handle
  }
}
