import { NextResponse } from "next/server";
import { BusinessCategory } from "@/features/shared/lib/database/types/business";
import { SessionService } from "@/features/agent/sessions/sessionService";
import { addPromptToSession } from "@/features/agent/services/addPromptToSession";
import { updateToolsToSession } from "@/features/agent/services/updateToolsToSession";
import { getInitialRequestedTools } from "@/features/shared/lib/database/types/tools";
import { sessionManager } from "@/features/agent/sessions/sessionSyncManager";
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
  // Extract business category from query parameters
  const url = new URL(request.url);
  const categoryParam = url.searchParams.get('category');

  // Default to TRANSPORT if no category provided
  const businessCategory = categoryParam as BusinessCategory || BusinessCategory.TRANSPORT;

  const businessInfo = getBusinessIdByCategory(businessCategory);
  console.log('🔍 [API] /realtime-session called with category:', businessCategory);

  try {
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

    // Debug: Verify session is persisted
    const verifySession = await sessionManager.get(callId);
    console.log('🔍 [API] Session verification:', {
      sessionId: callId,
      sessionExists: !!verifySession,
      sessionInMemory: !!verifySession,
      businessName: verifySession?.businessEntity?.name
    });

    // Get OpenAI ephemeral token with tools and instructions
    const sessionConfig = {
      session: {
        type: "realtime",
        model: "gpt-4o-realtime-preview-2025-06-03",
        audio: {
          output: {
            voice: "alloy",
          },
        },
        // Add tools from backend session
        tools: session.currentTools?.map(tool => tool.function_schema) || [],
        tool_choice: "auto",
        // Add instructions from backend session
        instructions: session.aiInstructions || `You are a helpful ${businessCategory} booking assistant for Skedy services.`
      },
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

    // Return token and whole session
    return NextResponse.json({
      ...data, // OpenAI token data
      session: session // Whole backend session
    });
  } catch (error) {
    console.error("Error in /realtime-session:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

const getBusinessIdByCategory = (category: BusinessCategory) => {
  switch (category) {
    case BusinessCategory.TRANSPORT:
      return {
        businessId: "be1f3d11-5a5a-4004-964a-15a01b6d5dd9",
      };
    case BusinessCategory.CLEANING:
      return {
        businessId: "be1f3d11-5a5a-4004-964a-15a01b6d5dd9",
      };
    case BusinessCategory.HANDYMAN:
      return {
        businessId: "be1f3d11-5a5a-4004-964a-15a01b6d5dd9",

      };
    case BusinessCategory.BEAUTY:
      return {
        businessId: "be1f3d11-5a5a-4004-964a-15a01b6d5dd9",

      };
    case BusinessCategory.FITNESS:
      return {
        businessId: "be1f3d11-5a5a-4004-964a-15a01b6d5dd9",
      };
    case BusinessCategory.GARDENING:
      return {
        businessId: "be1f3d11-5a5a-4004-964a-15a01b6d5dd9",

      };
    default:
      return {
        businessId: "be1f3d11-5a5a-4004-964a-15a01b6d5dd9",
      };
  }
};
