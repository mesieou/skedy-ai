import { TwilioCallEvent, TwilioVoiceResponse } from './types';
import { createLLMCommunication } from '../intelligence/LLM';

// Handle incoming calls
export function handleIncomingCall(): TwilioVoiceResponse {
  // Use environment variable for webhook URL or construct from ngrok
  const baseUrl = process.env.NGROK_URL || process.env.VERCEL_URL || 'https://192a14c79fb8.ngrok-free.app';

  const twiml = `
    <?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="alice">Hello! You've reached Skedy AI. How can I help you today?</Say>
      <Gather input="speech" action="${baseUrl}/api/voice/twilio-speech" method="POST" timeout="10">
        <Say voice="alice">Please speak your request.</Say>
      </Gather>
      <Say voice="alice">I didn't catch that. Please try calling again.</Say>
    </Response>
  `.trim();

  return { twiml };
}

// Handle call status updates
export function handleCallStatus(event: TwilioCallEvent): void {
  console.log(`Call ${event.CallSid} status: ${event.CallStatus}`);

  switch (event.CallStatus) {
    case 'completed':
      console.log(`Call completed. Duration: ${event.Duration}s`);
      break;
    case 'failed':
      console.log(`Call failed from ${event.From}`);
      break;
    case 'no-answer':
      console.log(`No answer from ${event.To}`);
      break;
  }
}

// Handle speech input with AI processing
export async function handleSpeechInput(speechResult: string): Promise<TwilioVoiceResponse> {
  try {
    // Process speech with LLM
    const aiResponse = await createLLMCommunication(
      `You are a helpful AI assistant for Skedy AI scheduling service.
       User said: "${speechResult}"
       Respond briefly and helpfully in 2-3 sentences max.`
    );

    const twiml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">${aiResponse}</Say>
        <Pause length="1"/>
        <Say voice="alice">Thank you for calling Skedy AI. Goodbye!</Say>
        <Hangup/>
      </Response>
    `.trim();

    return { twiml };
  } catch (error) {
    console.error('AI processing error:', error);

    const fallbackTwiml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">I'm sorry, I'm having trouble processing your request right now. Please try again later.</Say>
        <Hangup/>
      </Response>
    `.trim();

    return { twiml: fallbackTwiml };
  }
}
