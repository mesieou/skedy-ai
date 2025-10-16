import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/features/shared/lib/supabase/server';
import { OnboardingSessionService } from '@/features/onboarding/lib/services/onboarding-session-service';
import { OnboardingAgentService } from '@/features/onboarding/lib/services/onboarding-agent-service';

/**
 * POST /api/onboarding/session
 * Create or get onboarding session for authenticated user
 */
export async function POST() {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get or create onboarding session
    const session = await OnboardingSessionService.getOrCreate(user.id);

    // Start conversation if new session
    let greeting: string | undefined;
    if (session.interactions.length === 0) {
      const agentService = new OnboardingAgentService();
      greeting = await agentService.startConversation(session.id);
    }

    return NextResponse.json({
      session,
      greeting
    });

  } catch (error) {
    console.error('Error in POST /api/onboarding/session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/onboarding/session/:sessionId
 * Get existing onboarding session
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get session ID from query params
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Get session
    const session = await OnboardingSessionService.get(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (session.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({ session });

  } catch (error) {
    console.error('Error in GET /api/onboarding/session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
