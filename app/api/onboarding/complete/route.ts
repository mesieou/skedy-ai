import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/features/shared/lib/supabase/server';
import { OnboardingSessionService } from '@/features/onboarding/lib/services/onboarding-session-service';
import { BusinessSetupService } from '@/features/onboarding/lib/services/business-setup-service';

/**
 * POST /api/onboarding/complete
 * Complete onboarding and create business
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get session and verify ownership
    const session = await OnboardingSessionService.get(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Validate session data
    const setupService = new BusinessSetupService();
    const validation = setupService.validateSession(session);

    if (!validation.valid) {
      return NextResponse.json(
        { 
          error: 'Incomplete onboarding data',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    // Create business from onboarding data
    const business = await setupService.createBusinessFromOnboarding(session);

    // Update session with business ID and mark as completed
    await OnboardingSessionService.update(sessionId, {
      businessId: business.id
    });

    await OnboardingSessionService.complete(sessionId);

    return NextResponse.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        email: business.email
      }
    });

  } catch (error) {
    console.error('Error in POST /api/onboarding/complete:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
