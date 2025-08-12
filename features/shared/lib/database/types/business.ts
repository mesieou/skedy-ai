import type { BaseEntity } from './base';

export interface Business extends BaseEntity {
  name: string;
  email: string;
  phone_number: string;
  address: string;
  time_zone: string;
  language: string;
  business_category: string;
  charges_gst: boolean;
  gst_rate?: number;
  currency_code: string;
  number_of_providers: number;
  subscription_type: string;
  payment_methods: string[];
  preferred_payment_method: string;
  deposit_type?: string;
  deposit_percentage?: number | null;
  deposit_fixed_amount?: number;
  website_url?: string;
  whatsapp_number?: string;
  whatsapp_phone_number_id?: string;
  stripe_connect_account_id?: string;
  stripe_account_status?: string;
  ai_config?: {
    personality?: string;
    response_style?: string;
    business_hours?: Record<string, string>;
    services?: string[];
  };
}

export type CreateBusinessData = Omit<Business, 'id' | 'created_at' | 'updated_at'>;
export type UpdateBusinessData = Partial<Omit<Business, 'id' | 'created_at'>>;
