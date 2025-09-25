import { NextResponse } from "next/server";
import { executeToolFunction } from "@/features/agent/services/executeTool";
import { sessionManager } from "@/features/agent/sessions/sessionSyncManager";
import { sentry } from "@/features/shared/utils/sentryService";
import { getBusinessIdByCategory } from "@/features/shared/lib/demo-business-config";
import { trackToolExecution } from "@/features/agent/services/helpers/tool-interaction-tracker";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const action = url.searchParams.get('action');

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId required' }, { status: 400 });
    }

    if (action === 'getSession') {
      const session = await sessionManager.get(sessionId);
      if (!session) {
        return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        session: session
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { sessionId, toolName, args } = await request.json();

    console.log(`🔧 [API] Executing tool: ${toolName} for session ${sessionId}`);

    // Add breadcrumb for demo tool execution
    sentry.addBreadcrumb('Demo tool execution started', 'demo-tool', {
      sessionId: sessionId,
      toolName: toolName,
      argsKeys: Object.keys(args || {})
    });

    // Debug: Check what sessions exist
    const allSessions = sessionManager.list();
    console.log(`🔍 [API] Available sessions:`, allSessions.map(s => s.id));

    // Get the backend session (try without businessId first, then with each business category)
    let session = await sessionManager.get(sessionId);

    // If not found in memory, try Redis fallback with business context
    if (!session) {
      console.log(`🔍 [API] Session not in memory, trying Redis fallback...`);
      const businessCategories = ['removalist', 'manicurist', 'plumber'];

      for (const category of businessCategories) {
        // Try to get business ID for this category
        try {
          const { BusinessCategory } = await import('@/features/shared/lib/database/types/business');
          const categoryEnum = category === 'removalist' ? BusinessCategory.REMOVALIST :
                              category === 'manicurist' ? BusinessCategory.MANICURIST :
                              BusinessCategory.PLUMBER;

          const businessInfo = getBusinessIdByCategory(categoryEnum);
          session = await sessionManager.get(sessionId, businessInfo.businessId);

          if (session) {
            console.log(`✅ [API] Session recovered from Redis using ${category} business context`);
            break;
          }
        } catch (error) {
          console.log(`⚠️ [API] Failed to try ${category} business context:`, error);
        }
      }
    }

    console.log(`🔍 [API] Session lookup result:`, {
      sessionId,
      found: !!session,
      sessionExists: !!session,
      businessName: session?.businessEntity?.name
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: `Session not found: ${sessionId}. Available sessions: ${allSessions.map(s => s.id).join(', ')}` },
        { status: 404 }
      );
    }

    // Handle special demo cleanup command
    if (toolName === 'end_session') {
      console.log(`🧹 [API] Ending demo session: ${sessionId}`);

      // Use the same cleanup logic as backend handleWebSocketClose
      const { handleWebSocketClose } = await import('@/features/agent/real-time-open-ai/eventHandlers/connectionHandlers');

      try {
        // Call the backend cleanup function (simulating WebSocket close)
        await handleWebSocketClose(session, 1000, 'Demo session ended by user');

        console.log(`✅ [API] Demo session ${sessionId} ended and cleaned up successfully`);

        return NextResponse.json({
          success: true,
          result: { message: 'Session ended and cleaned up successfully' },
          sessionId: sessionId,
          toolName: toolName
        });

      } catch (cleanupError) {
        console.error(`❌ [API] Error during session cleanup:`, cleanupError);

        // Track cleanup error
        sentry.trackError(cleanupError as Error, {
          sessionId: sessionId,
          businessId: session.businessId,
          operation: 'demo_session_cleanup_error',
          metadata: {
            originalError: (cleanupError as Error).message
          }
        });

        return NextResponse.json({
          success: false,
          error: `Session cleanup failed: ${(cleanupError as Error).message}`,
          sessionId: sessionId,
          toolName: toolName
        }, { status: 500 });
      }
    }

    // Handle transcript storage
    if (toolName === 'store_transcript') {
      console.log(`📝 [API] Storing ${args.type} transcript for session ${sessionId}`);

      try {
        const { storeUserTranscript } = await import('@/features/agent/real-time-open-ai/eventHandlers/storeUserTranscript');
        const { storeAiTranscript } = await import('@/features/agent/real-time-open-ai/eventHandlers/storeAiTranscript');

        if (args.type === 'user') {
          await storeUserTranscript(session, {
            transcript: args.transcript as string,
            item_id: args.itemId as string
          } as unknown as import('@/features/agent/real-time-open-ai/types/server/events/conversation/serverInputAudioTranscriptionCompletedTypes').ServerInputAudioTranscriptionCompletedEvent);
        } else if (args.type === 'ai') {
          await storeAiTranscript(session, {
            transcript: args.transcript as string,
            item_id: args.itemId as string
          } as unknown as import('@/features/agent/real-time-open-ai/types/server/events/response/serverResponseOutputAudioTranscriptDoneTypes').ServerResponseOutputAudioTranscriptDoneEvent);
        }

        console.log(`✅ [API] ${args.type} transcript stored successfully`);

        return NextResponse.json({
          success: true,
          result: { message: `${args.type} transcript stored` },
          sessionId: sessionId,
          toolName: toolName
        });

      } catch (transcriptError) {
        console.error(`❌ [API] Error storing ${args.type} transcript:`, transcriptError);

        return NextResponse.json({
          success: false,
          error: `Transcript storage failed: ${(transcriptError as Error).message}`,
          sessionId: sessionId,
          toolName: toolName
        }, { status: 500 });
      }
    }

    // Execute the tool using the agent system
    const result = await executeToolFunction(toolName, args, session);

    // Track tool execution in interactions using shared function
    trackToolExecution(session, toolName, result);
    console.log(`🔧 [API] Tracked tool execution in interactions: ${toolName}`);

    console.log(`✅ [API] Tool ${toolName} executed successfully`);

    // Add breadcrumb for successful tool execution
    sentry.addBreadcrumb('Demo tool execution completed', 'demo-tool', {
      sessionId: sessionId,
      toolName: toolName,
      success: (result as { success?: boolean }).success !== false
    });

    return NextResponse.json({
      success: true,
      result: result,
      sessionId: sessionId,
      toolName: toolName
    });

  } catch (error) {
    console.error(`❌ [API] Tool execution failed:`, error);

    // Track error in Sentry
    sentry.trackError(error as Error, {
      sessionId: 'unknown',
      businessId: 'unknown',
      operation: 'demo_tool_execution',
      metadata: {
        toolName: 'unknown',
        errorMessage: (error as Error).message
      }
    });

    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
}
