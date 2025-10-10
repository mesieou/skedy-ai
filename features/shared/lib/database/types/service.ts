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
  // Charge between customers + return to base (skip initial base to customer
  BETWEEN_CUSTOMERS_AND_BACK_TO_BASE = 'between_customers_and_back_to_base',
  // Charge from base + between customers (skip return to base)
  FROM_BASE_AND_BETWEEN_CUSTOMERS = 'from_base_and_between_customers',
}

// Pricing combinations enum
export enum PricingCombination {
  // === Multiple components with multiple tiers per person rates ===
  LABOR_PER_HOUR_PER_PERSON = 'labor_per_hour_per_person',
  LABOR_PER_MINUTE_PER_PERSON = 'labor_per_minute_per_person',
  TRAVEL_PER_KM_PER_PERSON = 'travel_per_km_per_person',
  TRAVEL_PER_MINUTE_PER_PERSON = 'travel_per_minute_per_person',
  TRAVEL_PER_HOUR_PER_PERSON = 'travel_per_hour_per_person',
  TRAVEL_PER_KM_PER_VEHICLE = 'travel_per_km_per_vehicle',
  TRAVEL_PER_MINUTE_PER_VEHICLE = 'travel_per_minute_per_vehicle',
  TRAVEL_PER_HOUR_PER_VEHICLE = 'travel_per_hour_per_vehicle',

  // === Multiple components with multiple tiers Crew rates===
  LABOR_PER_HOUR_TEAM_RATE = 'labor_per_hour_team_rate',
  LABOR_PER_MINUTE_TEAM_RATE = 'labor_per_minute_team_rate',
  TRAVEL_PER_KM_TEAM_RATE = 'travel_per_km_team_rate',
  TRAVEL_PER_MINUTE_TEAM_RATE = 'travel_per_minute_team_rate',
  TRAVEL_PER_HOUR_TEAM_RATE = 'travel_per_hour_team_rate',

  // === Multiple components with one tier ===
  TRAVEL_PER_KM = 'travel_per_km',
  TRAVEL_PER_MINUTE = 'travel_per_minute',
  TRAVEL_PER_HOUR = 'travel_per_hour',
  LABOUR_PER_HOUR = 'labour_per_hour',
  LABOUR_PER_MINUTE = 'labour_per_minute',

  // Only one component with multiple tiers Per person rates
  SERVICE_PER_MINUTE_PER_PERSON = 'service_per_minute_per_person',
  SERVICE_PER_HOUR_PER_PERSON = 'service_per_hour_per_person',

   // Only one component with multiple tiers Team rates
   SERVICE_PER_MINUTE_TEAM_RATE = 'service_per_minute_team_rate',
   SERVICE_PER_HOUR_TEAM_RATE = 'service_per_hour_team_rate',

  // Only one component with one tier
  SERVICE_FIXED_PER_SERVICE = 'service_fixed_per_service',
  SERVICE_PER_MINUTE = 'service_per_minute',
  SERVICE_PER_HOUR = 'service_per_hour',
  SERVICE_PER_ROOM = 'service_per_room',
  SERVICE_PER_SQM = 'service_per_sqm'
}

// Job scope types for duration estimates
export enum JobScope {
  ONE_ITEM = 'one_item',
  FEW_ITEMS = 'few_items',
  HOUSE_MOVE_1_BEDROOM = 'house_move_1_bedroom',
  HOUSE_MOVE_2_BEDROOM = 'house_move_2_bedroom',
  HOUSE_MOVE_3_BEDROOM = 'house_move_3_bedroom',
  HOUSE_MOVE_4_BEDROOM = 'house_move_4_bedroom',
  HOUSE_MOVE_5_PLUS_BEDROOM = 'house_move_5_plus_bedroom',
  OFFICE_MOVE_SMALL = 'office_move_small',
  OFFICE_MOVE_MEDIUM = 'office_move_medium',
  OFFICE_MOVE_LARGE = 'office_move_large',
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

// Base service interface
interface BaseService extends BaseEntity {
  business_id: string;
  name: string;
  description: string;
  how_it_works?: string;
  pricing_config: PricingConfig | null;
  ai_function_requirements?: string[];           // Required fields: ['pickup_addresses', 'number_of_people']
  ai_job_scope_options?: string[] | null;        // Valid job scope options: ['one_item', 'few_items', 'house_move_1_bedroom']
}

// Business service (no travel required)
export interface BusinessService extends BaseService {
  location_type: LocationType.BUSINESS;
  // No travel_charging_model field - business services don't travel
}

// Mobile service (requires travel)
export interface MobileService extends BaseService {
  location_type: LocationType.CUSTOMER | LocationType.PICKUP_AND_DROPOFF;
  travel_charging_model?: TravelChargingModel; // Optional override - uses business default if not specified
}

// Discriminated union type
export type Service = BusinessService | MobileService;

// Type guard functions
export function isMobileService(service: Service): service is MobileService {
  return service.location_type !== LocationType.BUSINESS;
}

export function isBusinessService(service: Service): service is BusinessService {
  return service.location_type === LocationType.BUSINESS;
}

export type CreateServiceData =
  | Omit<BusinessService, 'id' | 'created_at' | 'updated_at'>
  | Omit<MobileService, 'id' | 'created_at' | 'updated_at'>;

export type UpdateServiceData = Partial<Omit<Service, 'id' | 'created_at'>>
