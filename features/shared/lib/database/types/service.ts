import { BaseEntity } from "./base";

// Service enums
export enum LocationType {
  CUSTOMER = 'customer',
  BUSINESS = 'business',
  PICKUP_AND_DROPOFF = 'pickup_and_dropoff'
}

export enum TravelChargingModel {
  // Only charge between customer locations (pickup to dropoff)
  BETWEEN_CUSTOMER_LOCATIONS = 'between_customer_locations',
  // Charge from business base to customers + between customers  
  FROM_BASE_TO_CUSTOMERS = 'from_base_to_customers',
  // Charge between customers + return to base
  CUSTOMERS_AND_BACK_TO_BASE = 'customers_and_back_to_base',
  // Charge entire route (base → customers → base)
  FULL_ROUTE = 'full_route',
}

// Pricing combinations enum
export enum PricingCombination {
  // Multiple components with multiple tiers
  LABOR_PER_HOUR_PER_PERSON = 'labor_per_hour_per_person',
  LABOR_PER_MINUTE_PER_PERSON = 'labor_per_minute_per_person',
  LABOR_PER_HOUR_PER_ROOM = 'labor_per_hour_per_room',
  TRAVEL_PER_KM_PER_PERSON = 'travel_per_km_per_person',
  TRAVEL_PER_MINUTE_PER_PERSON = 'travel_per_minute_per_person',
  TRAVEL_PER_KM_PER_VEHICLE = 'travel_per_km_per_vehicle',
  TRAVEL_PER_MINUTE_PER_VEHICLE = 'travel_per_minute_per_vehicle',

  // Multiple components with one tier
  TRAVEL_PER_KM = 'travel_per_km',
  TRAVEL_PER_MINUTE = 'travel_per_minute',
  LABOUR_PER_HOUR = 'labour_per_hour',
  LABOUR_PER_MINUTE = 'labour_per_minute',

  // Only one component with multiple tiers
  SERVICE_PER_MINUTE_PER_PERSON = 'service_per_minute_per_person',
  SERVICE_PER_HOUR_PER_PERSON = 'service_per_hour_per_person',
  SERVICE_PER_ROOM = 'service_per_room',
  SERVICE_PER_SQM = 'service_per_sqm',

  // Only one component with one tier
  SERVICE_FIXED_PER_SERVICE = 'service_fixed_per_service'
}

// Pricing structure types
export interface PricingTier {
  min_quantity: number;
  max_quantity: number;
  price: number;
  duration_estimate_mins?: number | Record<string, number> | null;
}

export interface PricingComponent {
  name: string;
  pricing_combination: PricingCombination;
  tiers: PricingTier[];
}

export interface PricingConfig {
  components: PricingComponent[];
}

export interface Service extends BaseEntity {
  business_id: string;
  name: string;
  description: string;
  location_type: LocationType;
  travel_charging_model: TravelChargingModel | null; // Required if location_type involves travel
  pricing_config: PricingConfig | null;
}

export type CreateServiceData = Omit<Service, 'id' | 'created_at' | 'updated_at'>;
export type UpdateServiceData = Partial<Omit<Service, 'id' | 'created_at'>>
