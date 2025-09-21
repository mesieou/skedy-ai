import { BaseEntity } from "./base";

export enum PROMPTS_NAMES {
  MAIN_CONVERSATION = 'main_conversation',
}

export interface Prompt extends BaseEntity {
  business_category: string;
  prompt_version: string;
  prompt_content: string;
  prompt_name: string;
  rating?: number;
  created_at: string;
  updated_at: string;
}


// Create/Update types
export type CreatePromptData = Omit<Prompt, 'id' | 'created_at' | 'updated_at'>;
export type UpdatePromptData = Partial<Omit<Prompt, 'id' | 'created_at' | 'updated_at'>>;
