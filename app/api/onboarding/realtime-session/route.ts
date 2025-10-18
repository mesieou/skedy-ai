import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/features/shared/lib/supabase/server';
import { OnboardingSessionService } from '@/features/onboarding/lib/services/onboarding-session-service';
import { ONBOARDING_STEPS } from '@/features/onboarding/lib/constants/onboarding-steps';

/**
 * GET /api/onboarding/realtime-session
 * Create ephemeral key for OpenAI Realtime API for onboarding
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
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get onboarding session
    const session = await OnboardingSessionService.get(sessionId);

    if (!session || session.userId !== user.id) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get current step instructions
    const currentStep = ONBOARDING_STEPS.find(step => step.status === session.status);
    const instructions = currentStep?.aiPrompt || 'Help the user with onboarding.';

    // Create ephemeral key from OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'verse',
        instructions: `You are a friendly onboarding assistant for Skedy, an AI-powered booking platform.

${instructions}

Current session context:
- User: ${user.email}
- Current step: ${session.status}
- Completed steps: ${session.data.completedSteps.join(', ')}
${session.data.websiteUrl ? `- Website: ${session.data.websiteUrl}` : ''}
${session.data.businessAnalysis ? `
- Business: ${session.data.businessAnalysis.businessName}
- Services: ${session.data.businessAnalysis.services?.map((s: { name: string }) => s.name).join(', ')}
` : ''}

CRITICAL RULES FOR VOICE CONVERSATION:
- Speak naturally like a helpful human assistant
- Ask ONE question at a time and wait for response
- Keep responses SHORT - 1 to 2 sentences maximum
- Be warm, friendly, and conversational
- Use natural speech patterns, not robotic phrases
- Do NOT use emojis, special characters, or markdown
- Do NOT say things like "asterisk" or "emoji"
- Speak in plain, natural English only
- When confirming information, just say it naturally
- Example: Instead of "Great exclamation mark", just say "Great"
- Example: Instead of "Pool Cleaning dash maintenance", just say "Pool Cleaning for maintenance"

Remember: You are SPEAKING to the user, not writing text. Sound natural and human.`,
        modalities: ['audio'],  // AUDIO ONLY - no text output
        temperature: 0.8,
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        },
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('❌ [Realtime Session] OpenAI error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const data = await openaiResponse.json();

    console.log('✅ [Realtime Session] Created for onboarding:', {
      sessionId: session.id,
      userId: user.id,
      currentStep: session.status
    });

    return NextResponse.json({
      value: data.client_secret.value,
      session: {
        id: session.id,
        status: session.status,
        userId: user.id,
        currentStep: currentStep?.name
      }
    });

  } catch (error) {
    console.error('❌ [Realtime Session] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create realtime session' },
      { status: 500 }
    );
  }
}
