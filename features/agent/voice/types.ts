// Twilio webhook event types
export interface TwilioCallEvent {
  CallSid: string;
  AccountSid: string;
  From: string;
  To: string;
  CallStatus: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'failed' | 'no-answer' | 'canceled';
  Direction: 'inbound' | 'outbound';
  Timestamp?: string;
  Duration?: string;
}

export interface TwilioVoiceResponse {
  twiml: string;
}
