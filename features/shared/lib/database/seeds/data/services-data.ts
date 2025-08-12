import type { CreateServiceData } from '../../types/services';

// Test service data for seeding
export const removalServiceData: CreateServiceData = {
  business_id: "placeholder-business-id", // Will be replaced with actual business_id
  name: "Local Removals",
  description: "Professional local moving services within Melbourne metro area. Includes furniture wrapping, loading, transportation, and unloading.",
  location_type: "local",
  has_price_components: true,
  minimum_charge: 200
};

export const packingServiceData: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Packing Service",
  description: "Complete packing service using professional materials. We pack your belongings safely and securely for transport.",
  location_type: "on_site",
  has_price_components: true,
  minimum_charge: 150
};

export const storageServiceData: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Storage Solutions", 
  description: "Secure storage facilities available for short-term and long-term storage needs.",
  location_type: "facility",
  has_price_components: false,
  minimum_charge: 100
};
