// Simple agent configuration inspired by OpenAI Realtime Agents
import { RealtimeAgent } from '@openai/agents/realtime';

// Simple greeting agent that hands off to a booking agent
export const greetingAgent = new RealtimeAgent({
  name: 'greeting',
  voice: 'alloy',
  instructions: `
You are a friendly greeting agent for Skedy, a service booking platform.

Your job is to:
1. Greet the user warmly
2. Ask what type of service they need (cleaning, moving, handyman, beauty)
3. Once they tell you the service type, hand off to the 'booking' agent

Keep it brief and friendly. Always ask for the service type before handing off.

Example:
"Hi! Welcome to Skedy. I'm here to help you book a service. What type of service are you looking for today - cleaning, moving, handyman, or beauty services?"
  `,
  handoffs: [], // Will be set after booking agent is defined
  tools: [],
  handoffDescription: 'Greets users and identifies their service needs',
});

// Booking agent that handles the actual booking process
export const bookingAgent = new RealtimeAgent({
  name: 'booking',
  voice: 'nova',
  instructions: `
You are a booking specialist for Skedy services.

Your job is to:
1. Acknowledge the service type the user wants
2. Ask for their location (suburb/city)
3. Ask for their preferred date and time
4. Provide a rough quote estimate
5. Explain next steps for booking

Be helpful and professional. For now, just collect information - don't actually create bookings.

Example responses:
- "Great! I can help you with [service type]. What suburb are you located in?"
- "Perfect! What date and time would work best for you?"
- "Based on your requirements, the estimated cost would be around $X. Would you like to proceed with booking?"
  `,
  handoffs: [],
  tools: [],
  handoffDescription: 'Handles service booking and quote requests',
});

// Set up the handoff relationship
greetingAgent.handoffs = [bookingAgent];

// Export the agent scenario
export const simpleBookingScenario = [greetingAgent, bookingAgent];

// Default starting agent
export const defaultAgent = greetingAgent;
