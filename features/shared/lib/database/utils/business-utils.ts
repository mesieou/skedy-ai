import { BusinessCategory } from '../types/business';
import { TravelChargingModel } from '../types/service';

/**
 * Compute the default travel charging model based on business category and service types
 * This abstracts the technical details from business owners during onboarding
 */
export function computeDefaultTravelModel(
  category: BusinessCategory, 
  offers_mobile: boolean
): TravelChargingModel | null {
  // If business doesn't offer mobile services, no travel model needed
  if (!offers_mobile) {
    return null;
  }
  
  // Auto-determine based on business category
  switch (category) {
    case BusinessCategory.BEAUTY:
    case BusinessCategory.CLEANING:
    case BusinessCategory.FITNESS:
    case BusinessCategory.HANDYMAN:
      // These businesses typically travel from their base (office/salon/shop) to customers
      return TravelChargingModel.FROM_BASE_TO_CUSTOMERS;
      
    case BusinessCategory.TRANSPORT:
      // Transport businesses typically charge between customer locations (pickup → dropoff)
      return TravelChargingModel.BETWEEN_CUSTOMER_LOCATIONS;
      
    case BusinessCategory.GARDENING:
      // Gardeners typically travel from base to customer properties
      return TravelChargingModel.FROM_BASE_TO_CUSTOMERS;
      
    case BusinessCategory.OTHER:
    default:
      // Safe default for unknown business types
      return TravelChargingModel.FROM_BASE_TO_CUSTOMERS;
  }
}

/**
 * Check if a business offers mobile services based on their configuration
 */
export function isBusinessMobile(business: { offers_mobile_services: boolean }): boolean {
  return business.offers_mobile_services;
}

/**
 * Check if a business is hybrid (offers both mobile and location services)
 */
export function isBusinessHybrid(business: { 
  offers_mobile_services: boolean; 
  offers_location_services: boolean; 
}): boolean {
  return business.offers_mobile_services && business.offers_location_services;
}

/**
 * Get a human-readable description of the business service model
 */
export function getBusinessServiceDescription(business: {
  offers_mobile_services: boolean;
  offers_location_services: boolean;
}): string {
  if (business.offers_mobile_services && business.offers_location_services) {
    return 'Hybrid (mobile + location services)';
  }
  if (business.offers_mobile_services) {
    return 'Mobile services only';
  }
  if (business.offers_location_services) {
    return 'Location-based services only';
  }
  return 'No services configured';
}
