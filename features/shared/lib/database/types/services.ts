import { BaseEntity } from "./base";

// Service enums
export enum LocationType {
  CUSTOMER = 'customer',
  BUSINESS = 'business',
  PICKUP_AND_DROPOFF = 'pickup_and_dropoff'
}

export interface Service extends BaseEntity {
  business_id: string;
  name: string;
  description: string;
  location_type: LocationType;
  has_price_components: boolean;
  minimum_charge: number;
}

export type CreateServiceData = Omit<Service, 'id' | 'created_at' | 'updated_at'>;
export type UpdateServiceData = Partial<Omit<Service, 'id' | 'created_at'>>;
