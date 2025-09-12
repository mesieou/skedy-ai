import type { CreateFrequentQuestionData } from '../../types/frequent-questions';
import { QuestionType, QuestionSource } from '../../types/frequent-questions';

// Test frequent question data for seeding (for other businesses)
export const cancellationQuestionData: CreateFrequentQuestionData = {
  business_id: "placeholder-business-id", // Will be replaced with actual business_id
  type: QuestionType.POLICY,
  source: QuestionSource.WEBSITE,
  title: "What is your cancellation policy?",
  content: "Cancellations made 48+ hours before your move: Full refund. 24-48 hours: 50% deposit refund. Less than 24 hours: No refund. Same day cancellations are charged the full deposit amount."
};

export const depositQuestionData: CreateFrequentQuestionData = {
  business_id: "placeholder-business-id",
  type: QuestionType.POLICY,
  source: QuestionSource.WEBSITE,
  title: "Do I need to pay a deposit to secure my booking?",
  content: "Yes, we require a $100 deposit to secure your booking. This deposit is deducted from your final invoice on moving day. Deposits can be paid via credit card, bank transfer, or cash."
};

// Skedy AI Agent FAQ data for seeding
export const howAgentWorksQuestionData: CreateFrequentQuestionData = {
  business_id: "placeholder-business-id", // Will be replaced with actual business_id
  type: QuestionType.FAQ,
  source: QuestionSource.WEBSITE,
  title: "How does Skedy's AI agent work?",
  content: "Skedy's AI agent answers your business phone calls 24/7, handles customer inquiries, provides quotes, and books appointments directly into your calendar. It understands your services, pricing, and availability in real-time, giving customers instant responses while you focus on your work."
};

export const targetBusinessesQuestionData: CreateFrequentQuestionData = {
  business_id: "placeholder-business-id",
  type: QuestionType.FAQ,
  source: QuestionSource.WEBSITE,
  title: "Which types of businesses can use Skedy?",
  content: "Skedy works for any service-based business that takes bookings - removalists, cleaners, handymen, gardeners, beauty services, fitness trainers, and more. If you provide services at customer locations or your business premises, Skedy can handle your calls and bookings."
};

export const gettingStartedQuestionData: CreateFrequentQuestionData = {
  business_id: "placeholder-business-id",
  type: QuestionType.FAQ,
  source: QuestionSource.WEBSITE,
  title: "How do I get started with Skedy?",
  content: "Getting started is simple: 1) Sign up and tell us about your business and services, 2) We'll configure your AI agent with your pricing and availability, 3) Forward your business calls to your Skedy number, 4) Your AI agent starts taking calls immediately. Setup takes less than 30 minutes."
};

export const availabilityQuestionData: CreateFrequentQuestionData = {
  business_id: "placeholder-business-id",
  type: QuestionType.FAQ,
  source: QuestionSource.WEBSITE,
  title: "Is the AI agent available 24/7?",
  content: "Yes! Your Skedy AI agent works around the clock, 365 days a year. It never sleeps, takes breaks, or goes on holiday. Customers can call anytime and get instant quotes and bookings, even when you're busy or after hours."
};

export const accuracyQuestionData: CreateFrequentQuestionData = {
  business_id: "placeholder-business-id",
  type: QuestionType.FAQ,
  source: QuestionSource.WEBSITE,
  title: "How accurate are the quotes and bookings?",
  content: "Very accurate! The AI agent uses your exact pricing structure, real-time availability, and service details. It calculates quotes the same way you would, considers travel time and distance, and only books available time slots. You maintain full control over your pricing and calendar."
};

export const customerExperienceQuestionData: CreateFrequentQuestionData = {
  business_id: "placeholder-business-id",
  type: QuestionType.FAQ,
  source: QuestionSource.WEBSITE,
  title: "What's the customer experience like?",
  content: "Customers have natural phone conversations with your AI agent. It sounds professional, understands Australian accents and locations, handles complex requests, and provides instant quotes. Most customers don't realize they're speaking with AI - they just get fast, helpful service."
};

export const integrationQuestionData: CreateFrequentQuestionData = {
  business_id: "placeholder-business-id",
  type: QuestionType.FAQ,
  source: QuestionSource.WEBSITE,
  title: "Does Skedy integrate with my existing tools?",
  content: "Yes! Skedy integrates with Google Calendar for availability and bookings. We're constantly adding new integrations. Your existing business processes remain the same - Skedy just handles the phone calls and creates bookings for you."
};

export const controlQuestionData: CreateFrequentQuestionData = {
  business_id: "placeholder-business-id",
  type: QuestionType.FAQ,
  source: QuestionSource.WEBSITE,
  title: "Can I control what the AI agent says and does?",
  content: "Absolutely! You set your services, pricing, availability, and business policies. The AI agent follows your rules exactly. You can update your information anytime through the dashboard, and changes take effect immediately."
};

export const missedCallsQuestionData: CreateFrequentQuestionData = {
  business_id: "placeholder-business-id",
  type: QuestionType.FAQ,
  source: QuestionSource.WEBSITE,
  title: "What happens to calls when I'm available?",
  content: "You choose! You can have all calls go to the AI agent, or set it to only answer when you're busy or after hours. Many businesses prefer the AI to handle all calls so they can focus on work without interruptions."
};

export const dataSecurityQuestionData: CreateFrequentQuestionData = {
  business_id: "placeholder-business-id",
  type: QuestionType.FAQ,
  source: QuestionSource.WEBSITE,
  title: "Is my business and customer data secure?",
  content: "Yes, security is our top priority. All data is encrypted, stored securely in Australia, and we follow strict privacy protocols. We only store the information needed to provide quotes and bookings. Customer payment details are handled securely through Stripe."
};

export const supportQuestionData: CreateFrequentQuestionData = {
  business_id: "placeholder-business-id",
  type: QuestionType.FAQ,
  source: QuestionSource.WEBSITE,
  title: "What support do I get?",
  content: "Full support! We help with setup, training, and ongoing optimization. You get a dedicated dashboard to monitor calls, review bookings, and adjust settings. Our Australian support team is available to help whenever you need it."
};

export const costSavingsQuestionData: CreateFrequentQuestionData = {
  business_id: "placeholder-business-id",
  type: QuestionType.FAQ,
  source: QuestionSource.WEBSITE,
  title: "How much time and money can Skedy save me?",
  content: "Significant savings! Most businesses save 10-15 hours per week on phone calls and admin. That's time you can spend earning money instead of answering phones. Plus, you never miss a call or potential booking, increasing your revenue."
};

export const trialQuestionData: CreateFrequentQuestionData = {
  business_id: "placeholder-business-id",
  type: QuestionType.FAQ,
  source: QuestionSource.WEBSITE,
  title: "Can I try Skedy before committing?",
  content: "Yes! We offer a free trial so you can test how Skedy works with your business. During the trial, you'll see exactly how the AI agent handles your calls and books appointments. No long-term contracts required."
};

export const customizationQuestionData: CreateFrequentQuestionData = {
  business_id: "placeholder-business-id",
  type: QuestionType.FAQ,
  source: QuestionSource.WEBSITE,
  title: "Can the AI agent handle my specific business requirements?",
  content: "Yes! Every business is unique, and Skedy adapts to your specific needs. Whether you have complex pricing, special requirements, multiple service areas, or unique booking rules, we configure the AI agent to match exactly how you operate."
};
