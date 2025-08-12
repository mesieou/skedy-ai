import { BaseEntity } from "./base";

export interface PriceComponentTier extends BaseEntity {
  price_component_id: string;
  min_quantity: number;
  max_quantity: number;
  price: number;
  duration_estimate_mins?: number | Record<string, number> | null;
}

export type CreatePriceComponentTierData = Omit<PriceComponentTier, 'id' | 'created_at' | 'updated_at'>;
export type UpdatePriceComponentTierData = Partial<Omit<PriceComponentTier, 'id' | 'created_at'>>;
