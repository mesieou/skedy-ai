import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingCall, handleCallStatus } from '@/features/agent/voice/call-handlers';
import { TwilioCallEvent } from '@/features/agent/voice/types';

export async function POST(request: NextRequest) {
  try {
    // Log incoming webhook for debugging
    console.log('🔔 Twilio webhook received:', request.url);

    // Parse Twilio form data
    const formData = await request.formData();

    // Log form data for debugging
    const formDataEntries = Object.fromEntries(formData.entries());
    console.log('📋 Twilio form data:', formDataEntries);

    const twilioEvent: TwilioCallEvent = {
      CallSid: formData.get('CallSid') as string,
      AccountSid: formData.get('AccountSid') as string,
      From: formData.get('From') as string,
      To: formData.get('To') as string,
      CallStatus: formData.get('CallStatus') as TwilioCallEvent['CallStatus'],
      Direction: formData.get('Direction') as TwilioCallEvent['Direction'],
      Timestamp: formData.get('Timestamp') as string,
      Duration: formData.get('Duration') as string,
    };

    console.log('📞 Processing call event:', {
      CallSid: twilioEvent.CallSid,
      CallStatus: twilioEvent.CallStatus,
      Direction: twilioEvent.Direction,
      From: twilioEvent.From,
      To: twilioEvent.To
    });

    // Route based on call status
    if (twilioEvent.CallStatus === 'ringing' && twilioEvent.Direction === 'inbound') {
      // Handle incoming call
      console.log('🔄 Handling incoming call...');
      const response = handleIncomingCall();
      console.log('✅ Generated TwiML response');
      return new NextResponse(response.twiml, {
        headers: { 'Content-Type': 'application/xml' },
      });
    } else {
      // Handle status updates
      console.log('📊 Handling call status update...');
      handleCallStatus(twilioEvent);
      return new NextResponse('OK', { status: 200 });
    }
  } catch (error) {
    console.error('❌ Twilio webhook error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return new NextResponse('Error processing webhook', { status: 500 });
  }
}
