import type { BaseEntity } from './base';

export interface Business extends BaseEntity {
  name: string;
  phone_number: string;
  email?: string;
  address?: string;
  ai_config?: {
    personality?: string;
    response_style?: string;
    business_hours?: Record<string, string>;
    services?: string[];
  };
  status: 'active' | 'inactive' | 'pending';
}

export type CreateBusinessData = Omit<Business, 'id' | 'created_at' | 'updated_at'>;
export type UpdateBusinessData = Partial<Omit<Business, 'id' | 'created_at'>>;
