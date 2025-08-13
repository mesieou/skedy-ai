import type { CreatePriceComponentData } from '../../types/price-components';
import { PricingMethod } from '../../types/price-components';

// Hourly rate - hourly pricing for removalists
export const hourlyRateComponentDataForRemovalists: CreatePriceComponentData = {
  service_id: "placeholder-service-id", // Will be replaced with actual service_id
  name: "Hourly Rate",
  pricing_method: PricingMethod.HOURLY,
  has_tiers: true,
  tier_unit_label: "movers"
};

// Distance fee - per minute
export const distanceComponentDataForRemovalists: CreatePriceComponentData = {
  service_id: "placeholder-service-id",
  name: "Distance Fee",
  pricing_method: PricingMethod.PER_MINUTE,
  has_tiers: true,
  tier_unit_label: "movers"
};

// Manicure fee - fixed price
export const manicureComponentData: CreatePriceComponentData = {
  service_id: "placeholder-service-id",
  name: "Manicure Fee",
  pricing_method: PricingMethod.FIXED,
  has_tiers: false,
  tier_unit_label: null
};
