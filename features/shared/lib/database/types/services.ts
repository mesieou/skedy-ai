import { BaseEntity } from "./base";

export interface Service extends BaseEntity {
  business_id: string;
  name: string;
  description: string;
  location_type: string;
  has_price_components: boolean;
  minimum_charge: number;
}

export type CreateServiceData = Omit<Service, 'id' | 'created_at' | 'updated_at'>;
export type UpdateServiceData = Partial<Omit<Service, 'id' | 'created_at'>>;
