import { Session } from "../../sessions/session";
import { sentry } from "@/features/shared/utils/sentryService";

export interface ConversationItemDoneEvent {
  type: "conversation.item.done";
  item_id: string;
}

export async function logFunctionProcessed(
  session: Session,
  event: ConversationItemDoneEvent
): Promise<void> {
  console.log(`📝 [FunctionProcessed] Session ${session.id} | Function result processed | Item: ${event.item_id}`);

  // Add breadcrumb for function processing confirmation
  sentry.addBreadcrumb(`Function result processed by OpenAI`, 'function-processed', {
    sessionId: session.id,
    businessId: session.businessId,
    conversationId: session.openAiConversationId,
    itemId: event.item_id
  });
}
