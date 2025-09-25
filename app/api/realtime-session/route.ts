import { NextResponse } from "next/server";
import { BusinessCategory } from "@/features/shared/lib/database/types/business";
import { SessionService } from "@/features/agent/sessions/sessionService";
import { addPromptToSession } from "@/features/agent/services/addPromptToSession";
import { updateToolsToSession } from "@/features/agent/services/updateToolsToSession";
import { getInitialRequestedTools } from "@/features/shared/lib/database/types/tools";
import { sessionManager } from "@/features/agent/sessions/sessionSyncManager";
import { sentry } from "@/features/shared/utils/sentryService";
import { createWebRTCSessionConfig } from "@/features/shared/lib/openai-realtime-config";
import { getBusinessIdByCategory } from "@/features/shared/lib/demo-business-config";
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  // Extract business category from query parameters
  const url = new URL(request.url);
  const categoryParam = url.searchParams.get('category');

  // Default to REMOVALIST if no category provided
  const businessCategory = categoryParam as BusinessCategory || BusinessCategory.REMOVALIST;

  const businessInfo = getBusinessIdByCategory(businessCategory);
  console.log('🔍 [API] /realtime-session called with category:', businessCategory);

  try {
    // Add breadcrumb for demo session creation
    sentry.addBreadcrumb('Demo session creation started', 'demo-session', {
      businessCategory: businessCategory,
      businessId: businessInfo.businessId
    });

    // Create backend session
    const callId = `demo_${uuidv4()}`;
    const event = {
      id: callId,
      object: 'event',
      created_at: Date.now(),
      type: 'demo.session.create' as const,
      data: {
        call_id: callId,
        business_id: businessInfo.businessId,
        session_id: callId
      }
    };
    const session = await SessionService.createOrGet(callId, event);

    // Initialize session with prompt and tools
    await addPromptToSession(session);
    await updateToolsToSession(session, [...getInitialRequestedTools()]);

    console.log('✅ [API] Session created with tools:', session.currentTools?.map(t => t.name));

    // Add breadcrumb for successful session setup
    sentry.addBreadcrumb('Demo session setup completed', 'demo-session', {
      sessionId: callId,
      businessName: session.businessEntity?.name,
      toolsCount: session.currentTools?.length || 0,
      toolNames: session.currentTools?.map(t => t.name) || []
    });

    // Debug: Verify session is persisted
    const verifySession = await sessionManager.get(callId);
    console.log('🔍 [API] Session verification:', {
      sessionId: callId,
      sessionExists: !!verifySession,
      sessionInMemory: !!verifySession,
      businessName: verifySession?.businessEntity?.name
    });

    // Get OpenAI ephemeral token with tools and instructions using shared config
    const tools = session.currentTools?.map(tool => tool.function_schema) || [];
    const instructions = session.aiInstructions || `You are a helpful ${businessCategory} booking assistant for Skedy services.`;

    const sessionConfig = {
      session: createWebRTCSessionConfig(tools, instructions)
    };

    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionConfig),
      }
    );

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [API] Created ephemeral token:', data.value ? 'YES' : 'NO');

    // Add breadcrumb for successful token creation
    sentry.addBreadcrumb('Demo ephemeral token created', 'demo-session', {
      sessionId: callId,
      hasToken: !!data.value
    });

    // Return token and whole session
    return NextResponse.json({
      ...data, // OpenAI token data
      session: session // Whole backend session
    });
  } catch (error) {
    console.error("Error in /realtime-session:", error);

    // Track error in Sentry
    sentry.trackError(error as Error, {
      sessionId: 'unknown',
      businessId: businessInfo.businessId,
      operation: 'demo_session_creation',
      metadata: {
        businessCategory: businessCategory
      }
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
