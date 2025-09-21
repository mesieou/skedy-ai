import { BaseEntity } from "./base";

export interface BusinessPrompt extends BaseEntity {
  business_id: string;
  prompt_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Create/Update types
export type CreateBusinessPromptData = Omit<BusinessPrompt, 'id' | 'created_at' | 'updated_at'>;
export type UpdateBusinessPromptData = Partial<Omit<BusinessPrompt, 'id' | 'created_at' | 'updated_at'>>;
