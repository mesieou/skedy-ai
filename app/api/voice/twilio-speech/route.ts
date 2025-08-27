import { NextRequest, NextResponse } from 'next/server';
import { handleSpeechInput } from '@/features/agent/voice/call-handlers';

export async function POST(request: NextRequest) {
  try {
    console.log('🎤 Twilio speech webhook received:', request.url);

    const formData = await request.formData();
    const formDataEntries = Object.fromEntries(formData.entries());
    console.log('🎵 Speech form data:', formDataEntries);

    const speechResult = formData.get('SpeechResult') as string;
    const callSid = formData.get('CallSid') as string;

    console.log('🗣️ Processing speech:', { speechResult, callSid });

    if (!speechResult) {
      // No speech detected
      console.log('❌ No speech detected');
      const twiml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">I didn't hear anything. Please try again.</Say>
          <Hangup/>
        </Response>
      `.trim();

      return new NextResponse(twiml, {
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    console.log('🤖 Processing speech with AI...');
    const response = await handleSpeechInput(speechResult);
    console.log('✅ AI response generated');

    return new NextResponse(response.twiml, {
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('❌ Speech processing error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return new NextResponse('Error processing speech', { status: 500 });
  }
}
