import { Session } from "../../sessions/session";
import { sentry } from "@/features/shared/utils/sentryService";

export interface ResponseDoneEvent {
  type: "response.done";
  response: {
    id: string;
    status: string;
    output?: Array<{
      type: string;
    }>;
  };
}

export async function requestResponseAfterFunction(
  session: Session,
  event: ResponseDoneEvent
): Promise<void> {
  if (!session.ws) return;

  // Check if response had function calls
  const hadFunctionCalls = event.response.output?.some(item => item.type === 'function_call') || false;

  console.log(`✅ [ResponseDone] Session ${session.id} | Response completed | Had functions: ${hadFunctionCalls}`);

  // Clear pending tool execution data
  session.pendingToolExecution = undefined;

  // Request next response if function calls were executed
  if (hadFunctionCalls) {
    const responseRequest = {
      type: "response.create",
      event_id: `response_after_function_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      response: {
        conversation: "auto"
      }
    };

    session.ws.send(JSON.stringify(responseRequest));
    console.log(`🔄 [ResponseDone] Requested next AI response after function execution`);

    // Add breadcrumb for response request
    sentry.addBreadcrumb(`Requested response after function execution`, 'response-request', {
      sessionId: session.id,
      businessId: session.businessId,
      conversationId: session.openAiConversationId,
      responseId: event.response.id
    });
  }
}
