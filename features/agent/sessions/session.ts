import { Business } from "../../shared/lib/database/types/business";
import { User } from "../../shared/lib/database/types/user";
import { Interaction } from "../../shared/lib/database/types/interactions";
import { DetailedQuoteResult, QuoteRequestInfo } from "../../scheduling/lib/types/booking-calculations";
import { Tool } from "../../shared/lib/database/types/tools";
import { TokenSpent } from "../types";
import WebSocket from "ws";

export interface DepositPaymentState {
  status: 'pending' | 'completed' | 'failed';
  quoteId: string;
  paymentLink?: string;
  stripeSessionId?: string;
  amount: number;
  createdAt: number;
  bookingId?: string;  // Link to the actual booking in database
}

/**
 * OpenAI Realtime API session information
 */
export interface OpenAiSession {
  conversation_id: string;
  type?: string;
  tools?: Array<{ name?: string }>;
}

export interface Session {
  id: string;              // Call SID
  businessId: string;
  businessEntity: Business;
  customerPhoneNumber: string;
  customerId?: string;
  customerEntity?: User;
  status: "active" | "ended";
  ws?: WebSocket;
  channel: "phone" | "whatsapp" | "website";

  // API key management
  assignedApiKeyIndex: number;

  // OpenAI Realtime API
  openAiCallId?: string;              // OpenAI call ID from acceptCall response
  openAiConversationId?: string;
  interactions: Interaction[];
  tokenUsage: TokenSpent;
  startedAt: number;
  endedAt?: number;
  durationInMinutes?: number;


  // === TOOL SYSTEM ADDITIONS ===
  // Cached entities for tools (minimal dependencies)
  serviceNames: string[];                 // List of service names for fuzzy search

  // AI-driven tool management
  allAvailableToolNames: string[];        // All tool names available for this business (for prompt reference)
  currentTools: Tool[];                   // Currently available tools (grows via addToolsToSession)

  // AI & Tools
  aiInstructions?: string;                    // Generated prompt for OpenAI
  promptName?: string;                        // Name of the prompt template used
  promptVersion?: string;                     // Version of the prompt for A/B testing

  // Interaction tracking (simple flags)
  isFirstAiResponse: boolean;                 // Track if this is the initial greeting
  pendingCustomerInput?: string;              // Store user input until AI responds
  pendingToolExecution?: {                    // Store tool execution until AI responds
    name: string;
    result: string;
    schema: string;
    schemaVersion: string;
  };

  // Conversation data
  quotes: Array<{
    result: DetailedQuoteResult;
    request: QuoteRequestInfo;
  }>;                                        // All quotes with their request data
  selectedQuote?: {
    result: DetailedQuoteResult;
    request: QuoteRequestInfo;
  };                                         // Currently selected quote with its request data

  // Payment state management
  depositPaymentState?: DepositPaymentState;

  // Demo-specific fields
  ephemeralToken?: string;                   // WebRTC ephemeral token for demo sessions
}
