import { NextResponse } from "next/server";
import { executeToolFunction } from "@/features/agent/services/executeTool";
import { sessionManager } from "@/features/agent/sessions/sessionSyncManager";
import { sentry } from "@/features/shared/utils/sentryService";

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

    // Get the backend session
    const session = await sessionManager.get(sessionId);
    console.log(`🔍 [API] Session lookup result:`, {
      sessionId,
      found: !!session,
      sessionExists: !!session
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: `Session not found: ${sessionId}. Available sessions: ${allSessions.map(s => s.id).join(', ')}` },
        { status: 404 }
      );
    }

    // Execute the tool using the agent system
    const result = await executeToolFunction(toolName, args, session);

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
