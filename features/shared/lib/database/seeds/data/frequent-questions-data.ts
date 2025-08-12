import type { CreateFrequentQuestionData } from '../../types/frequent-questions';

// Test frequent question data for seeding
export const cancellationQuestionData: CreateFrequentQuestionData = {
  business_id: "placeholder-business-id", // Will be replaced with actual business_id
  type: "policy",
  source: "website",
  title: "What is your cancellation policy?",
  content: "Cancellations made 48+ hours before your move: Full refund. 24-48 hours: 50% deposit refund. Less than 24 hours: No refund. Same day cancellations are charged the full deposit amount."
};

export const depositQuestionData: CreateFrequentQuestionData = {
  business_id: "placeholder-business-id",
  type: "payment",
  source: "customer_inquiry",
  title: "Do I need to pay a deposit to secure my booking?",
  content: "Yes, we require a $100 deposit to secure your booking. This deposit is deducted from your final invoice on moving day. Deposits can be paid via credit card, bank transfer, or cash."
};
