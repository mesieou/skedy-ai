import type { CreateServiceData } from '../../types/service';
import { LocationType, PricingCombination, TravelChargingModel } from '../../types/service';

// Re-export addresses for convenience
export * from './addresses-data';

// Removalist Services - One service - two components, multi tiered
// Not fixed price
export const removalServiceData: CreateServiceData = {
  business_id: "placeholder-business-id", // Will be replaced with actual business_id
  name: "Local Removals",
  description: "Professional local moving services within Melbourne metro area. Includes furniture wrapping, loading, transportation, and unloading.",
  location_type: LocationType.PICKUP_AND_DROPOFF,
  travel_charging_model: TravelChargingModel.BETWEEN_CUSTOMER_LOCATIONS,
  pricing_config: {
    components: [
      {
        name: "Hourly Rate",
        pricing_combination: PricingCombination.LABOR_PER_HOUR_PER_PERSON,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 95.00,
            duration_estimate_mins: {
              "one_item": 40,
              "multiple_items": 60,
              "house_move_one_room": 120,
              "house_move_two_rooms": 160,
              "house_move_three_rooms": 240
            }
          },
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 145.00,
            duration_estimate_mins: {
              "one_item": 30,
              "multiple_items": 45,
              "house_move_one_room": 90,
              "house_move_two_rooms": 120,
              "house_move_three_rooms": 180
            }
          },
          {
            min_quantity: 3,
            max_quantity: 3,
            price: 185.00,
            duration_estimate_mins: {
              "house_move_one_room": 60,
              "house_move_two_rooms": 80,
              "house_move_three_rooms": 120
            }
          }
        ]
      },
      {
        name: "Distance Fee",
        pricing_combination: PricingCombination.TRAVEL_PER_MINUTE_PER_PERSON,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 95.00,
            duration_estimate_mins: {
              "one_item": 40,
              "multiple_items": 60,
              "house_move_one_room": 120,
              "house_move_two_rooms": 160,
              "house_move_three_rooms": 240
            }
          },
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 145.00,
            duration_estimate_mins: {
              "one_item": 30,
              "multiple_items": 45,
              "house_move_one_room": 90,
              "house_move_two_rooms": 120,
              "house_move_three_rooms": 180
            }
          },
          {
            min_quantity: 3,
            max_quantity: 3,
            price: 185.00,
            duration_estimate_mins: {
              "house_move_one_room": 60,
              "house_move_two_rooms": 80,
              "house_move_three_rooms": 120
            }
          }
        ]
      }
    ]
  }
};

// Manicure Service - One service - one component, single tier
// Fixed price
// multiple services
export const manicureServiceData: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Manicure", 
  description: "Manicure service for hands and feet.",
  location_type: LocationType.CUSTOMER,
  // Uses business default_travel_charging_model
  pricing_config: {
    components: [
      {
        name: "Manicure Fee",
        pricing_combination: PricingCombination.SERVICE_FIXED_PER_SERVICE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 60.00,
            duration_estimate_mins: 45
          }
        ]
      }
    ]
  }
};

export const pedicureServiceData: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Pedicure", 
  description: "Pedicure service for feet.",
  location_type: LocationType.CUSTOMER,
  travel_charging_model: TravelChargingModel.FROM_BASE_TO_CUSTOMERS,
  pricing_config: {
    components: [
      {
        name: "Pedicure Fee",
        pricing_combination: PricingCombination.SERVICE_FIXED_PER_SERVICE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 90.00,
            duration_estimate_mins: 60
          }
        ]
      }
    ]
  }
};

// Cleaning Services
export const housecleaningServiceData: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "House Cleaning",
  description: "Complete house cleaning service including all rooms, bathrooms, and kitchen.",
  location_type: LocationType.CUSTOMER,
  travel_charging_model: TravelChargingModel.FROM_BASE_TO_CUSTOMERS,
  pricing_config: {
    components: [
      {
        name: "Hourly Cleaning Rate",
        pricing_combination: PricingCombination.LABOR_PER_HOUR_PER_PERSON,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 45.00,
            duration_estimate_mins: 120
          },
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 80.00,
            duration_estimate_mins: 90
          }
        ]
      },
      {
        name: "Travel Cost",
        pricing_combination: PricingCombination.TRAVEL_PER_KM,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 10,
            price: 2.50,
            duration_estimate_mins: null
          }
        ]
      }
    ]
  }
};

export const commercialCleaningServiceData: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Commercial Cleaning",
  description: "Office and commercial space cleaning service.",
  location_type: LocationType.CUSTOMER,
  travel_charging_model: TravelChargingModel.BETWEEN_CUSTOMER_LOCATIONS,
  pricing_config: {
    components: [
      {
        name: "Square Meter Rate",
        pricing_combination: PricingCombination.SERVICE_PER_SQM,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 100,
            price: 3.50,
            duration_estimate_mins: 180
          },
          {
            min_quantity: 101,
            max_quantity: 500,
            price: 2.80,
            duration_estimate_mins: 360
          },
          {
            min_quantity: 501,
            max_quantity: 1000,
            price: 2.20,
            duration_estimate_mins: 480
          }
        ]
      }
    ]
  }
};

// Handyman Services
export const plumbingServiceData: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Plumbing Repairs",
  description: "General plumbing repairs and installations.",
  location_type: LocationType.CUSTOMER,
  travel_charging_model: TravelChargingModel.FROM_BASE_TO_CUSTOMERS,
  pricing_config: {
    components: [
      {
        name: "Call-out Fee",
        pricing_combination: PricingCombination.SERVICE_FIXED_PER_SERVICE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 80.00,
            duration_estimate_mins: 60
          }
        ]
      },
      {
        name: "Hourly Labor",
        pricing_combination: PricingCombination.LABOUR_PER_HOUR,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 8,
            price: 95.00,
            duration_estimate_mins: 60
          }
        ]
      }
    ]
  }
};

export const electricalServiceData: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Electrical Work",
  description: "Electrical installations and repairs.",
  location_type: LocationType.CUSTOMER,
  travel_charging_model: TravelChargingModel.FULL_ROUTE, // Override: Emergency service needs full route charging
  pricing_config: {
    components: [
      {
        name: "Fixed Service Fee",
        pricing_combination: PricingCombination.SERVICE_FIXED_PER_SERVICE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 120.00,
            duration_estimate_mins: 90
          }
        ]
      }
    ]
  }
};

// Beauty Services
export const massageServiceData: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Relaxation Massage",
  description: "60-minute relaxation massage service.",
  location_type: LocationType.CUSTOMER,
  travel_charging_model: TravelChargingModel.FROM_BASE_TO_CUSTOMERS,
  pricing_config: {
    components: [
      {
        name: "Massage Fee",
        pricing_combination: PricingCombination.SERVICE_FIXED_PER_SERVICE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 120.00,
            duration_estimate_mins: 60
          }
        ]
      },
      {
        name: "Travel Fee",
        pricing_combination: PricingCombination.TRAVEL_PER_MINUTE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 60,
            price: 1.50,
            duration_estimate_mins: null
          }
        ]
      }
    ]
  }
};

export const hairServiceData: CreateServiceData = {
  business_id: "placeholder-business-id", 
  name: "Hair Styling",
  description: "Professional hair cut and styling service.",
  location_type: LocationType.CUSTOMER,
  travel_charging_model: TravelChargingModel.CUSTOMERS_AND_BACK_TO_BASE,
  pricing_config: {
    components: [
      {
        name: "Hair Service",
        pricing_combination: PricingCombination.SERVICE_FIXED_PER_SERVICE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 85.00,
            duration_estimate_mins: 90
          }
        ]
      }
    ]
  }
};

