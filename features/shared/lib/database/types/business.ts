import type { BaseEntity } from './base';

// Business enums
export enum BusinessCategory {
  TRANSPORT = 'transport',
  CLEANING = 'cleaning',
  HANDYMAN = 'handyman',
  GARDENING = 'gardening',
  BEAUTY = 'beauty',
  FITNESS = 'fitness',
  OTHER = 'other'
}

export enum SubscriptionType {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  PAYPAL = 'paypal',
  STRIPE = 'stripe'
}

export enum DepositType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed'
}

export interface Business extends BaseEntity {
  name: string;
  email: string;
  phone_number: string;
  address: string;
  time_zone: string;
  language: string;
  business_category: BusinessCategory;
  charges_gst: boolean;
  gst_rate?: number;
  currency_code: string;
  number_of_providers: number;
  subscription_type: SubscriptionType;
  payment_methods: PaymentMethod[];
  preferred_payment_method: PaymentMethod;
  deposit_type: DepositType;
  deposit_percentage?: number | null;
  deposit_fixed_amount?: number | null;
  website_url?: string | null;
  whatsapp_number?: string | null;
  whatsapp_phone_number_id?: string | null;
  stripe_connect_account_id?: string | null;
  stripe_account_status?: string | null;
}

export type CreateBusinessData = Omit<Business, 'id' | 'created_at' | 'updated_at'>;
export type UpdateBusinessData = Partial<Omit<Business, 'id' | 'created_at'>>;
