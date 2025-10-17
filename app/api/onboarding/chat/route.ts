import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/features/shared/lib/supabase/server';
import { OnboardingSessionService } from '@/features/onboarding/lib/services/onboarding-session-service';
import { OnboardingAgentService } from '@/features/onboarding/lib/services/onboarding-agent-service';

// Configure route to allow longer execution time for website scraping
// Vercel Pro: 300 seconds (5 minutes)
// Vercel Hobby: 10 seconds (will need upgrade for this feature)
export const maxDuration = 300; // 5 minutes

/**
 * POST /api/onboarding/chat
 * Send message to onboarding AI agent
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('\n🚀 [OnboardingChat API] Request received');
  
  try {
    // Get authenticated user
    console.log('🔐 [OnboardingChat API] Checking authentication...');
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ [OnboardingChat API] Authentication failed:', authError?.message);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('✅ [OnboardingChat API] User authenticated:', user.id);

    // Parse request body
    console.log('📥 [OnboardingChat API] Parsing request body...');
    const body = await request.json();
    const { sessionId, message } = body;
    
    console.log('📝 [OnboardingChat API] Message received:', {
      sessionId,
      messageLength: message?.length,
      messagePreview: message?.substring(0, 50)
    });

    if (!sessionId || !message) {
      console.error('❌ [OnboardingChat API] Missing required fields');
      return NextResponse.json(
        { error: 'Session ID and message are required' },
        { status: 400 }
      );
    }

    // Get session and verify ownership
    console.log('🔍 [OnboardingChat API] Fetching session...');
    const session = await OnboardingSessionService.get(sessionId);

    if (!session) {
      console.error('❌ [OnboardingChat API] Session not found:', sessionId);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ [OnboardingChat API] Session found:', {
      sessionId,
      userId: session.userId,
      status: session.status
    });

    if (session.userId !== user.id) {
      console.error('❌ [OnboardingChat API] User does not own session');
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Process message with AI agent
    console.log('🤖 [OnboardingChat API] Processing message with AI agent...');
    const agentService = new OnboardingAgentService();
    const result = await agentService.processMessage(sessionId, message);
    
    const duration = Date.now() - startTime;
    console.log('✅ [OnboardingChat API] Message processed successfully:', {
      duration: `${duration}ms`,
      responseLength: result.message?.length,
      toolCallsCount: result.toolCalls?.length || 0
    });

    return NextResponse.json({
      message: result.message,
      session: result.session,
      toolCalls: result.toolCalls
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [OnboardingChat API] Error after', `${duration}ms:`, error);
    console.error('❌ [OnboardingChat API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
