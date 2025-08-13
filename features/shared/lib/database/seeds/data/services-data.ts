import type { CreateServiceData } from '../../types/service';
import { LocationType } from '../../types/service';

// Test service data for seeding
export const removalServiceData: CreateServiceData = {
  business_id: "placeholder-business-id", // Will be replaced with actual business_id
  name: "Local Removals",
  description: "Professional local moving services within Melbourne metro area. Includes furniture wrapping, loading, transportation, and unloading.",
  location_type: LocationType.PICKUP_AND_DROPOFF,
  has_price_components: true,
  minimum_charge: 200
};

export const packingServiceData: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Packing Service",
  description: "Complete packing service using professional materials. We pack your belongings safely and securely for transport.",
  location_type: LocationType.PICKUP_AND_DROPOFF,
  has_price_components: true,
  minimum_charge: 150
};

export const manicureServiceData: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Manicure", 
  description: "Manicure service for hands and feet.",
  location_type: LocationType.CUSTOMER,
  has_price_components: false,
  minimum_charge: 0
};
