import { Session } from "../../sessions/session";
import { sentry } from "@/features/shared/utils/sentryService";

export interface SessionUpdatedEvent {
  type: "session.updated";
  session: {
    tools?: Array<{ name?: string }>;
  };
}

export async function logToolsUpdated(
  session: Session,
  event: SessionUpdatedEvent
): Promise<void> {
  const confirmedTools = event.session?.tools?.map(t => t.name).filter(Boolean) || [];

  console.log(`🔧 [ToolsUpdated] Session ${session.id} | Tools confirmed (${confirmedTools.length}): ${confirmedTools.join(', ')}`);

  // Add breadcrumb for tools update
  sentry.addBreadcrumb(`OpenAI session updated with tools`, 'session-tools', {
    sessionId: session.id,
    businessId: session.businessId,
    conversationId: session.openAiConversationId,
    toolsCount: confirmedTools.length,
    toolNames: confirmedTools.join(', ')
  });
}
