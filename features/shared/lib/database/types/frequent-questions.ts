import { BaseEntity } from "./base";

// Frequent question enums
export enum QuestionType {
  FAQ = 'faq',
  POLICY = 'policy',
  PRICING = 'pricing',
  PROCEDURE = 'procedure',
  TECHNICAL = 'technical'
}

export enum QuestionSource {
  WEBSITE = 'website',
  CUSTOMER_INQUIRY = 'customer_inquiry',
  PHONE_CALL = 'phone_call',
  EMAIL = 'email',
  CHAT = 'chat'
}

export interface FrequentQuestion extends BaseEntity {
  business_id: string;
  type: QuestionType;
  source: QuestionSource;
  title: string;
  content: string;
}

export type CreateFrequentQuestionData = Omit<FrequentQuestion, 'id' | 'created_at' | 'updated_at'>;
export type UpdateFrequentQuestionData = Partial<Omit<FrequentQuestion, 'id' | 'created_at'>>;
