import type { Service, PricingTier, PricingCombination } from '../../../shared/lib/database/types/service';
import type { Business } from '../../../shared/lib/database/types/business';
import type { Address } from '../../../shared/lib/database/types/addresses';

// Address roles for booking context
export enum AddressRole {
  PICKUP = 'pickup',
  DROPOFF = 'dropoff',
  SERVICE = 'service',
  BUSINESS_BASE = 'business_base'
}

// Booking address with context
export interface BookingAddress {
  id: string;
  address: Address;
  role: AddressRole;
  sequence_order: number;
  service_id?: string;
  special_instructions?: string;
}

// Service with quantity for booking
export interface ServiceWithQuantity {
  service: Service;
  quantity: number;
  serviceAddresses: BookingAddress[];
}



// Input for quote calculations - what customer is requesting
export interface QuoteRequestInfo {
  services: ServiceWithQuantity[];
  business: Business;
  addresses: BookingAddress[];
}

// Route segment for travel calculation
export interface RouteSegment {
  from_address: string;
  to_address: string;
  distance_km: number;
  duration_mins: number;
  cost: number;
  is_chargeable: boolean;
  service_id?: string;
  segment_type: 'customer_to_customer' | 'base_to_customer' | 'customer_to_base';
}

// Travel breakdown
export interface TravelBreakdown {
  total_distance_km: number;
  total_travel_time_mins: number;
  total_travel_cost: number;
  route_segments: RouteSegment[];
  free_travel_applied: boolean;
  free_travel_distance_km: number;
}

// Service cost breakdown
export interface ServiceBreakdown {
  service_id: string;
  service_name: string;
  quantity: number;
  service_cost: number;      // Only service-related costs (no travel)
  setup_cost: number;
  total_cost: number;        // service_cost + setup_cost (no travel)
  estimated_duration_mins: number;
  component_breakdowns: ComponentBreakdown[];
}

// Component cost breakdown
export interface ComponentBreakdown {
  component_name: string;
  pricing_combination: PricingCombination;
  tier_used: PricingTier;
  base_calculation: string; // e.g., "4 hours × 2 people × $72.50"
  cost: number;
  duration_mins: number;
}

// Helper type for the JSONB breakdown structure
export interface PriceBreakdown {
  service_breakdowns: ServiceBreakdown[];
  travel_breakdown: TravelBreakdown;
  business_fees: BusinessFeeBreakdown;
}

// Result of quote calculation - the calculated quote
export interface QuoteResultInfo {
  quote_id: string;
  total_estimate_amount: number;
  total_estimate_time_in_minutes: number;
  minimum_charge_applied: boolean;
  deposit_amount: number;
  remaining_balance: number;
  deposit_paid: boolean;
  price_breakdown: PriceBreakdown;
}

// Business fees
export interface BusinessFeeBreakdown {
  gst_amount: number;
  gst_rate: number;
  platform_fee: number;
  platform_fee_amount: number;
  platform_fee_percentage: number;
  payment_processing_fee: number;
  payment_processing_fee_amount: number;
  payment_processing_fee_percentage: number;
  other_fees: Array<{ name: string; amount: number }>;
}


// Pricing calculation context
export interface PricingContext {
  datetime: Date;
  is_peak_time: boolean;
  is_weekend: boolean;
  season: 'summer' | 'winter' | 'autumn' | 'spring';
  demand_level: 'low' | 'medium' | 'high';
}
