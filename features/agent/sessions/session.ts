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

  // MWAV Integration - Enquiry data collection (optional, only for MWAV partnerships)
  // Note: This structure is designed to be extractable into generic workflow system later
  mwavEnquiry?: {
    pickupLocations: Array<{
      index: number;
      address: string;
      parking_distance: string;  // Enum: 'at_the_door' | 'on_the_street' | etc.
      stairs_count: string;       // Enum: 'none' | '1' | '2' | '3' | '4' | '5+'
      has_lift: boolean;
    }>;
    dropoffLocations: Array<{
      index: number;
      address: string;
      parking_distance: string;  // Enum: 'at_the_door' | 'on_the_street' | etc.
      stairs_count: string;       // Enum: 'none' | '1' | '2' | '3' | '4' | '5+'
      has_lift: boolean;
    }>;
    items: Array<{
      item_name: string;
      quantity: number;
      category?: string;
      pickup_index: number;
      dropoff_index: number;
      notes?: string;
    }>;
    customerDetails?: {           // Customer info (NOT stored in Skedy DB)
      first_name: string;
      last_name: string;
      phone: string;
      email: string;
    };
    dateTime?: {                  // Move date/time
      preferred_date: string;
      time_preference: 'morning' | 'afternoon';
    };
    mwavQuote?: {                 // Quote from MWAV API
      quote_id: string;
      duration: {
        hours: number;
        minutes: number;
        display: string;
      };
      estimate: number;           // Total estimate amount
      currency: string;
      truck: string;              // e.g., "1x M Truck"
      movers: string;             // e.g., "2x Movers"
      accuracy_note: string;      // Their accuracy disclaimer
    };
    confirmationId?: string;      // Set when send_enquiry_confirmation is called
  };

  // Demo-specific fields
  ephemeralToken?: string;                   // WebRTC ephemeral token for demo sessions
}
