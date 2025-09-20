import { Business } from "../../shared/lib/database/types/business";
import { User } from "../../shared/lib/database/types/user";
import { Interaction } from "../../shared/lib/database/types/interactions";
import { QuoteResultInfo, QuoteRequestInfo } from "../../scheduling/lib/types/booking-calculations";
import { Tool } from "../../shared/lib/database/types/tools";
import { TokenSpent } from "../types";
import WebSocket from "ws";

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

  // OpenAI Realtime API
  openAiConversationId?: string;
  interactions: Interaction[];
  tokenUsage: TokenSpent;
  startedAt: number;
  endedAt?: number;
  durationInMinutes?: number;

  // === TOOL SYSTEM ADDITIONS ===
  // Cached entities for tools (minimal dependencies)
  serviceNames: string[];                 // List of service names for fuzzy search

  // AI & Tools
  aiInstructions?: string;                    // Generated prompt for OpenAI
  availableTools: Tool[];                     // All tools for this business
  activeTools: string[];                     // Currently active tool names

  // Conversation state for progressive tool injection
  quotes: QuoteResultInfo[];             // All quotes generated during conversation
  selectedQuote?: QuoteResultInfo;       // Currently selected quote result
  selectedQuoteRequest?: QuoteRequestInfo; // Currently selected quote request
  conversationState: ConversationState;  // Current state for progressive tool injection
}

/**
 * Conversation states for progressive tool injection
 */
export type ConversationState =
  | 'service_selection'    // Initial state - can select services
  | 'quoting'             // Getting quotes for services
  | 'availability'        // Checking availability for quotes
  | 'user_management'     // Creating/verifying user
  | 'booking'             // Ready to create booking
  | 'completed';          // Booking created
