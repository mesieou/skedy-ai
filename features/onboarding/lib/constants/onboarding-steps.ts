import { OnboardingStep, OnboardingStatus } from '../types/onboarding-session';

/**
 * Onboarding steps configuration
 * Defines the flow and AI prompts for each step
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    name: 'Welcome',
    description: 'Introduction and website URL collection',
    status: OnboardingStatus.WEBSITE_INPUT,
    order: 1,
    required: true,
    aiPrompt: `You are a friendly onboarding assistant for Skedy, an AI-powered booking platform. 
    
Your goal is to help the user set up their business on Skedy. Start by:
1. Greeting them warmly
2. Explaining that you'll help them set up their business in just a few minutes
3. Ask for their company website URL so you can learn about their business

Be conversational, encouraging, and professional. If they don't have a website, let them know you can still help them set up manually.`
  },
  {
    id: 'website_analysis',
    name: 'Website Analysis',
    description: 'Scraping and analyzing business website',
    status: OnboardingStatus.ANALYZING_WEBSITE,
    order: 2,
    required: false,
    aiPrompt: `You are analyzing the user's website to extract business information.

When the user provides a website URL:
1. Acknowledge that you received it
2. Tell them you're starting the analysis
3. Let them know it will take 30-60 seconds
4. DO NOT say "Loading..." - instead say something like "I'm analyzing your website now..."

Use the analyze_website tool to extract information about their services, contact details, and business model.`
  },
  {
    id: 'review_analysis',
    name: 'Review Business Information',
    description: 'Review and confirm AI-extracted business data',
    status: OnboardingStatus.REVIEWING_ANALYSIS,
    order: 3,
    required: true,
    aiPrompt: `You have analyzed the user's website and extracted business information.

Present your findings in a clear, organized way:
1. Business name and description
2. Services you identified
3. Contact information
4. Business characteristics (mobile services, location-based, etc.)

Ask the user to confirm if this information is correct, or if they'd like to make any changes. Be specific about what you found and express confidence appropriately.`
  },
  {
    id: 'business_details',
    name: 'Business Details',
    description: 'Collect additional business information',
    status: OnboardingStatus.BUSINESS_DETAILS,
    order: 4,
    required: true,
    aiPrompt: `Now collect essential business details that weren't found on the website.

Ask about:
1. Business category (if not clear)
2. Primary location/address
3. Time zone
4. Business phone number and email
5. Whether they travel to customers or customers come to them

Ask these questions naturally in conversation, not as a form. Confirm information they've already provided.`
  },
  {
    id: 'service_configuration',
    name: 'Service Configuration',
    description: 'Define services, pricing, and duration',
    status: OnboardingStatus.SERVICE_CONFIGURATION,
    order: 5,
    required: true,
    aiPrompt: `Help the user configure their services in detail.

For each service:
1. Confirm the service name and description
2. Ask about typical duration
3. Ask about pricing structure
4. Clarify if it requires travel to customer location

Be helpful in suggesting standard durations and pricing models for their industry. Make this feel collaborative, not interrogative.`
  },
  {
    id: 'provider_setup',
    name: 'Provider Setup',
    description: 'Configure service providers and team',
    status: OnboardingStatus.PROVIDER_SETUP,
    order: 6,
    required: true,
    aiPrompt: `Set up the service providers (team members) who will deliver services.

Ask:
1. How many service providers/team members do they have?
2. Will they (the owner) also be providing services?
3. Do they want to invite team members now or later?

Explain that each provider will have their own calendar and availability settings. Keep it simple and reassuring.`
  },
  {
    id: 'payment_setup',
    name: 'Payment Setup',
    description: 'Configure payment methods and Stripe',
    status: OnboardingStatus.PAYMENT_SETUP,
    order: 7,
    required: true,
    aiPrompt: `Set up payment processing for the business.

Explain:
1. Skedy uses Stripe for secure payment processing
2. They'll need to connect their Stripe account
3. Ask about payment methods they want to accept (card, bank transfer, cash)
4. Ask about deposit requirements (do they require deposits?)

Make this feel secure and professional. Emphasize that Stripe is industry-standard and secure.`
  },
  {
    id: 'tools_prompts',
    name: 'AI Tools & Prompts',
    description: 'Select AI capabilities and conversation style',
    status: OnboardingStatus.TOOLS_PROMPTS,
    order: 8,
    required: false,
    aiPrompt: `Configure the AI assistant that will handle their bookings.

Explain:
1. The AI can handle calls, texts, and web bookings
2. Suggest tools based on their business type (booking, quotes, payments, etc.)
3. Let them choose conversation style (professional, friendly, casual)

Make this exciting - this is where the magic happens! Show them how AI will save them time.`
  },
  {
    id: 'availability_config',
    name: 'Availability Configuration',
    description: 'Set working hours and availability',
    status: OnboardingStatus.AVAILABILITY_CONFIG,
    order: 9,
    required: true,
    aiPrompt: `Set up business hours and availability.

Ask about:
1. What days of the week are they open?
2. What are their typical working hours?
3. Do they want to generate availability for the next 30 days?

Explain that they can customize individual provider schedules later. Keep it simple for now.`
  },
  {
    id: 'final_review',
    name: 'Final Review',
    description: 'Review all settings before launch',
    status: OnboardingStatus.FINAL_REVIEW,
    order: 10,
    required: true,
    aiPrompt: `Congratulations! Review everything before launching.

Summarize:
1. Business information
2. Services configured
3. Team members
4. Payment setup status
5. AI capabilities enabled

Ask if they're ready to launch. Build excitement! This is the moment their AI-powered booking system goes live.`
  }
];

/**
 * Get step by status
 */
export function getStepByStatus(status: OnboardingStatus): OnboardingStep | undefined {
  return ONBOARDING_STEPS.find(step => step.status === status);
}

/**
 * Get next step
 */
export function getNextStep(currentStatus: OnboardingStatus): OnboardingStep | undefined {
  const currentStep = ONBOARDING_STEPS.find(step => step.status === currentStatus);
  if (!currentStep) return ONBOARDING_STEPS[0];
  
  const nextIndex = currentStep.order;
  return ONBOARDING_STEPS[nextIndex];
}

/**
 * Get previous step
 */
export function getPreviousStep(currentStatus: OnboardingStatus): OnboardingStep | undefined {
  const currentStep = ONBOARDING_STEPS.find(step => step.status === currentStatus);
  if (!currentStep || currentStep.order === 1) return undefined;
  
  const prevIndex = currentStep.order - 2;
  return ONBOARDING_STEPS[prevIndex];
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(completedSteps: OnboardingStatus[]): number {
  const requiredSteps = ONBOARDING_STEPS.filter(step => step.required);
  const completedRequired = completedSteps.filter(status => 
    requiredSteps.some(step => step.status === status)
  );
  
  return Math.round((completedRequired.length / requiredSteps.length) * 100);
}
