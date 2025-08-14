import type { CreateServiceData } from '../../types/service';
import { LocationType, PricingCombination, TravelChargingModel } from '../../types/service';

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
  travel_charging_model: TravelChargingModel.FROM_BASE_TO_CUSTOMERS,
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
        name: "Manicure Fee",
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

