import type { CreatePriceComponentData } from '../../types/price-components';
import { PricingMethod } from '../../types/price-components';

// Test price component data for seeding
export const hourlyRateComponentData: CreatePriceComponentData = {
  service_id: "placeholder-service-id", // Will be replaced with actual service_id
  name: "Hourly Rate",
  pricing_method: PricingMethod.HOURLY,
  has_tiers: true,
  tier_unit_label: "movers"
};

export const distanceComponentData: CreatePriceComponentData = {
  service_id: "placeholder-service-id",
  name: "Distance Fee",
  pricing_method: PricingMethod.PER_MINUTE,
  has_tiers: false,
  tier_unit_label: null
};
