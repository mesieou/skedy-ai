import { BaseEntity } from "./base";

export interface PriceComponent extends BaseEntity {
  service_id: string;
  name: string;
  pricing_method: string;
  has_tiers: boolean;
  tier_unit_label?: string | null;
}

export type CreatePriceComponentData = Omit<PriceComponent, 'id' | 'created_at' | 'updated_at'>;
export type UpdatePriceComponentData = Partial<Omit<PriceComponent, 'id' | 'created_at'>>;
