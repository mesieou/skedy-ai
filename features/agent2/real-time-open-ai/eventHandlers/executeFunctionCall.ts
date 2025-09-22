import { Session } from "../../sessions/session";
import { executeToolFunction } from "../../services/executeTool";
import { updateOpenAiSession } from "./updateOpenAiSession";
import { sentry } from "@/features/shared/utils/sentryService";
import { ServerResponseFunctionCallArgumentsDoneEvent } from "../types/server/events/response/serverResponseFunctionCallArgumentsDoneTypes";
import { RealtimeFunctionCallOutputItem } from "../types/client/events/clientConversationItemCreateTypes";
import assert from "assert";

export async function executeFunctionCall(
  session: Session,
  event: ServerResponseFunctionCallArgumentsDoneEvent
): Promise<void> {
  const { call_id, name, arguments: argsString } = event;

  console.log(`🔧 [FunctionCall] Executing function: ${name} (${call_id})`);

  // Add breadcrumb for function execution
  sentry.addBreadcrumb(`Executing function ${name}`, 'function-call', {
    sessionId: session.id,
    businessId: session.businessId,
    functionName: name,
    callId: call_id,
    conversationId: session.openAiConversationId
  });

  try {
    // Parse function arguments
    const args = JSON.parse(argsString);

    console.log(`🔧 [FunctionCall] Executing function: ${name} (${call_id})`);
    console.log(`📥 [FunctionCall] AI provided parameters:`, JSON.stringify(args, null, 2));

    // Add breadcrumb for function execution start
    sentry.addBreadcrumb(`Function call started: ${name}`, 'function-execution', {
      sessionId: session.id,
      businessId: session.businessId,
      functionName: name,
      callId: call_id,
      parameters: args
    });

    // Execute the function using executeTool service
    const result = await executeToolFunction(name, args, session);

    console.log(`📤 [FunctionCall] Function result:`, JSON.stringify(result, null, 2));

    // Add breadcrumb for function execution completion
    sentry.addBreadcrumb(`Function call completed: ${name}`, 'function-execution', {
      sessionId: session.id,
      businessId: session.businessId,
      functionName: name,
      callId: call_id,
      success: !!result,
      resultSize: JSON.stringify(result).length
    });

    // Update OpenAI session with current tools BEFORE sending result (if request_tool was executed)
    if (name === 'request_tool' && session.currentTools && session.currentTools.length > 0) {
      console.log(`🔧 [FunctionCall] Updating OpenAI session with new tools before sending result`);
      await updateOpenAiSession(session);
    }

    // Find the tool schema for this function
    const tool = session.currentTools?.find(t => t.name === name);

    assert(tool, `Tool ${name} not found in session.currentTools`);
    assert(tool.function_schema, `Tool ${name} missing function_schema`);
    assert(tool.version, `Tool ${name} missing version`);

    // Store tool execution info for the current interaction (only if not first AI response)
    if (!session.isFirstAiResponse) {
      session.pendingToolExecution = {
        name: name,
        result: JSON.stringify(result),
        schema: JSON.stringify(tool.function_schema),
        schemaVersion: tool.version
      };

      // Update the latest interaction if it exists
      const latestInteraction = session.interactions[session.interactions.length - 1];
      if (latestInteraction) {
        latestInteraction.generated_from_tool_calling = true;
        latestInteraction.tool_name = name;
        latestInteraction.tool_schema = JSON.stringify(tool.function_schema);
        latestInteraction.tool_schema_version = tool.version;
        latestInteraction.tool_result = JSON.stringify(result);
      }
    }

    // Send function result back to OpenAI AFTER tools are updated
    console.log(`📤 [FunctionCall] Sending result object:`, result);
    await sendFunctionResult(session, call_id, result);

    // Immediately request AI response (exactly like documentation)
    const responseRequest = {
      type: "response.create"
    };

    assert(session.ws, `No WebSocket connection available for session ${session.id}`);

    session.ws.send(JSON.stringify(responseRequest));
    console.log(`🔄 [FunctionCall] Immediately requested AI response after function execution`);

    console.log(`✅ [FunctionCall] Function ${name} executed successfully`);

    // Success breadcrumb
    sentry.addBreadcrumb(`Function ${name} executed successfully`, 'function-call', {
      sessionId: session.id,
      functionName: name,
      callId: call_id,
      resultType: typeof result,
      updatedInteraction: !session.isFirstAiResponse
    });

  } catch (error) {
    console.error(`❌ [FunctionCall] Function ${name} failed:`, error);

    // Track error in Sentry
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'execute_function_call',
      metadata: {
        functionName: name,
        callId: call_id,
        conversationId: session.openAiConversationId,
        arguments: argsString
      }
    });

    // Send error result back to OpenAI
    await sendFunctionResult(session, call_id, {
      success: false,
      error: `Function execution failed: ${error}`
    });
  }
}

async function sendFunctionResult(
  session: Session,
  callId: string,
  result: Record<string, unknown>
): Promise<void> {
  if (!session.ws) return;

  const functionOutputItem: RealtimeFunctionCallOutputItem = {
    type: "function_call_output",
    call_id: callId,
    output: JSON.stringify(result)  // Single stringify here, like old agent
  };

  const functionResultMessage = {
    type: "conversation.item.create",
    item: functionOutputItem
  };

  console.log(`📤 [FunctionCall] Sending complete message to OpenAI:`, JSON.stringify(functionResultMessage, null, 2));
  session.ws.send(JSON.stringify(functionResultMessage));
  console.log(`📤 [FunctionCall] Sent result for ${callId}`);
}
