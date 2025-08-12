import { BaseEntity } from "./base";

// Price component enums
export enum PricingMethod {
  FIXED = 'fixed',
  HOURLY = 'hourly',
  PER_MINUTE = 'per_minute',
  PER_KM = 'per_km',
  PER_ITEM = 'per_item'
}

export interface PriceComponent extends BaseEntity {
  service_id: string;
  name: string;
  pricing_method: PricingMethod;
  has_tiers: boolean;
  tier_unit_label?: string | null;
}

export type CreatePriceComponentData = Omit<PriceComponent, 'id' | 'created_at' | 'updated_at'>;
export type UpdatePriceComponentData = Partial<Omit<PriceComponent, 'id' | 'created_at'>>;
