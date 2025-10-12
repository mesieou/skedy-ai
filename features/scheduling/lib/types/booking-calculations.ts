import type { Service, PricingTier, PricingCombination } from '../../../shared/lib/database/types/service';
import type { Business } from '../../../shared/lib/database/types/business';
import type { BookingAddress } from '../../../shared/lib/database/types/addresses';

// Re-export address types from shared types (single source of truth)
export type { BookingAddress, AddressInput, ParsedGoogleAddress } from '../../../shared/lib/database/types/addresses';
export { AddressType } from '../../../shared/lib/database/types/addresses';

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
  number_of_people?: number; // Original number of people from quote request
}

// Route segment for travel calculation
export interface RouteSegment {
  from_address: string;
  to_address: string;
  distance_km: number;
  duration_mins: number;
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
}

// Service cost breakdown
export interface ServiceBreakdown {
  service_id: string;
  service_name: string;
  quantity: number;
  service_cost: number;      // Only service-related costs (no travel)
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

// QuoteResultInfo deleted - we now pass DetailedQuoteResult directly to response formatters

// Internal detailed quote result (for calculations and session storage)
export interface DetailedQuoteResult {
  quote_id: string;
  total_estimate_amount: number;
  total_estimate_time_in_minutes: number;
  minimum_charge_applied: boolean;
  deposit_amount: number;
  price_breakdown: PriceBreakdown;
}

// Complete quote calculation result (internal use)
export interface QuoteCalculationResult {
  quoteResult: DetailedQuoteResult;
  quoteRequest: QuoteRequestInfo;
}

// Business fees
export interface BusinessFeeBreakdown {
  gst_amount: number;
  platform_fee: number;
  payment_processing_fee: number;
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
