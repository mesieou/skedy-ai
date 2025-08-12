import { BaseEntity } from "./base";

export interface FrequentQuestion extends BaseEntity {
  business_id: string;
  type: string;
  source: string;
  title: string;
  content: string;
}

export type CreateFrequentQuestionData = Omit<FrequentQuestion, 'id' | 'created_at' | 'updated_at'>;
export type UpdateFrequentQuestionData = Partial<Omit<FrequentQuestion, 'id' | 'created_at'>>;
