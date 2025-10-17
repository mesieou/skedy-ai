import { Business } from "@/features/shared/lib/database/types/business";
import { User } from "@/features/shared/lib/database/types/user";

/**
 * Onboarding session status
 */
export enum OnboardingStatus {
  NOT_STARTED = 'not_started',
  WEBSITE_INPUT = 'website_input',
  ANALYZING_WEBSITE = 'analyzing_website',
  REVIEWING_ANALYSIS = 'reviewing_analysis',
  BUSINESS_DETAILS = 'business_details',
  SERVICE_CONFIGURATION = 'service_configuration',
  PROVIDER_SETUP = 'provider_setup',
  PAYMENT_SETUP = 'payment_setup',
  TOOLS_PROMPTS = 'tools_prompts',
  AVAILABILITY_CONFIG = 'availability_config',
  FINAL_REVIEW = 'final_review',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned'
}

/**
 * Onboarding step definition
 */
export interface OnboardingStep {
  id: string;
  name: string;
  description: string;
  status: OnboardingStatus;
  order: number;
  required: boolean;
  aiPrompt?: string; // Custom prompt for this step
}

/**
 * Business information extracted from website
 */
export interface BusinessAnalysis {
  // Basic info
  businessName?: string;
  description?: string;
  industry?: string;
  category?: string;
  
  // Contact info
  email?: string;
  phone?: string;
  address?: string;
  
  // Services
  services?: Array<{
    name: string;
    description?: string;
    suggestedPrice?: number;
    duration?: number;
  }>;
  
  // Business characteristics
  hasMobileServices?: boolean;
  hasLocationServices?: boolean;
  operatingHours?: string;
  serviceArea?: string;
  
  // Additional data
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
  
  // Raw data from MCP
  rawContent?: unknown;
  confidence?: number; // AI confidence in analysis (0-1)
  partialScrape?: boolean; // True if scraping was interrupted but data was still saved
  
  // Metadata
  analyzedAt: number;
  websiteUrl: string;
  knowledgeBaseTableName?: string;
}

/**
 * Onboarding session data stored in JSONB
 */
export interface OnboardingSessionData {
  // Website analysis
  websiteUrl?: string;
  businessAnalysis?: BusinessAnalysis;
  
  // User inputs and confirmations
  confirmedBusinessInfo?: Partial<Business>;
  
  // Service configuration
  services?: Array<{
    name: string;
    description?: string;
    price?: number;
    duration?: number;
    requiresTravel?: boolean;
  }>;
  
  // Provider setup
  numberOfProviders?: number;
  providerEmails?: string[];
  
  // Payment configuration
  stripeConnectAccountId?: string;
  paymentMethods?: string[];
  
  // Tools and prompts selection
  selectedTools?: string[];
  selectedPrompts?: string[];
  
  // Availability
  workingHours?: {
    [day: string]: {
      start: string;
      end: string;
      enabled: boolean;
    };
  };
  
  // Progress tracking
  completedSteps: OnboardingStatus[];
  currentStepData?: Record<string, unknown>;
  
  // AI conversation context
  conversationSummary?: string;
  lastAiMessage?: string;
}

/**
 * Onboarding session - similar to agent Session but for onboarding
 */
export interface OnboardingSession {
  id: string;
  userId: string;
  userEntity?: User;
  businessId?: string; // Created after analysis
  businessEntity?: Business;
  
  status: OnboardingStatus;
  currentStep: number;
  
  // Session data (stored as JSONB in DB)
  data: OnboardingSessionData;
  
  // AI conversation
  conversationId?: string; // OpenAI conversation ID
  interactions: OnboardingInteraction[];
  
  // Timestamps
  startedAt: number;
  lastActivityAt: number;
  completedAt?: number;
  
  // Metadata
  channel: 'web' | 'mobile';
  userAgent?: string;
}

/**
 * Onboarding interaction - chat message
 */
export interface OnboardingInteraction {
  id: string;
  onboardingSessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    step?: OnboardingStatus;
    toolCalls?: Array<{
      name: string;
      result?: unknown;
    }>;
    confidence?: number;
  };
  createdAt: number;
}

/**
 * Create onboarding session params
 */
export interface CreateOnboardingSessionParams {
  userId: string;
  channel?: 'web' | 'mobile';
  userAgent?: string;
}

/**
 * Update onboarding session params
 */
export interface UpdateOnboardingSessionParams {
  status?: OnboardingStatus;
  currentStep?: number;
  data?: Partial<OnboardingSessionData>;
  businessId?: string;
}
