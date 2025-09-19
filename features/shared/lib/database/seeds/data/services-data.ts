import type { CreateServiceData } from '../../types/service';
import { LocationType, PricingCombination, TravelChargingModel } from '../../types/service';

// Re-export addresses for convenience
export * from './addresses-data';

// ===================================================================
// EXAMPLE 1: Removalist - BETWEEN_CUSTOMER_LOCATIONS
// ===================================================================
// Location type: pickup and dropoff
// Travel charging model: BETWEEN_CUSTOMER_LOCATIONS (note: updated from comment)
// Two components:
//   - pricing combination: labor_per_hour_per_person
//     tiers: 1 person 95, 2 person 145, 3 person 185
//   - pricing combination: travel_per_minute_per_person
//     tiers: 1 person 95, 2 person 145, 3 person 185
export const removalistExample1ServiceData: CreateServiceData = {
  business_id: "placeholder-business-id", // Will be replaced with actual business_id
  name: "Local Removals - Between Customers",
  description: "Professional house move, furniture removal services.",
  how_it_works: "We send a team to pick up your items from the pickup location, transport them safely, and deliver to your dropoff location. You don't lift a finger - we handle all the heavy lifting, packing protection, and careful placement at the destination.",
  location_type: LocationType.PICKUP_AND_DROPOFF,
  travel_charging_model: TravelChargingModel.BETWEEN_CUSTOMER_LOCATIONS,
  pricing_config: {
    components: [
      {
        name: "Labor Cost",
        pricing_combination: PricingCombination.LABOR_PER_HOUR_TEAM_RATE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 95.00,
            duration_estimate_mins: {
              "one_item": 60,
              "few_items": 90,
              "house_move_1_bedroom": 120,
              "house_move_2_bedroom": 180,
              "house_move_3_bedroom": 240,
              "office_move_small": 100,
              "office_move_medium": 140
            }
          },
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 145.00,
            duration_estimate_mins: {
              "one_item": 30,
              "few_items": 60,
              "house_move_1_bedroom": 90,
              "house_move_2_bedroom": 120,
              "house_move_3_bedroom": 180,
              "office_move_small": 75,
              "office_move_medium": 100
            }
          },
          {
            min_quantity: 3,
            max_quantity: 3,
            price: 185.00,
            duration_estimate_mins: {
              "one_item": 20,
              "few_items": 45,
              "house_move_1_bedroom": 60,
              "house_move_2_bedroom": 90,
              "house_move_3_bedroom": 120,
              "office_move_small": 50,
              "office_move_medium": 75
            }
          }
        ]
      },
      {
        name: "Travel Cost",
        pricing_combination: PricingCombination.TRAVEL_PER_HOUR_TEAM_RATE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 95.00,
            duration_estimate_mins: null
          },
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 145.00,
            duration_estimate_mins: null
          },
          {
            min_quantity: 3,
            max_quantity: 3,
            price: 185.00,
            duration_estimate_mins: null
          }
        ]
      }
    ]
  }
};

// ===================================================================
// EXAMPLE 2: Removalist - FROM_BASE_AND_BETWEEN_CUSTOMERS
// ===================================================================
// Location type: pickup and dropoff
// Travel charging model: FROM_BASE_AND_BETWEEN_CUSTOMERS
// Two components:
//   - pricing combination: labor_per_hour (only one tier: 2 people 145)
//   - pricing combination: travel_per_km (only one tier: 2.50 per km)
export const removalistExample2ServiceData: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Interstate Removals - Base + Between",
  description: "Interstate moving services. Charges from base to customers plus between customers.",
  location_type: LocationType.PICKUP_AND_DROPOFF,
  travel_charging_model: TravelChargingModel.FROM_BASE_AND_BETWEEN_CUSTOMERS,
  pricing_config: {
    components: [
      {
        name: "Labor Cost",
        pricing_combination: PricingCombination.LABOUR_PER_HOUR,
        tiers: [
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 145.00,
            duration_estimate_mins: 180
          }
        ]
      },
      {
        name: "Travel Cost",
        pricing_combination: PricingCombination.TRAVEL_PER_KM,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1000,
            price: 2.50,
            duration_estimate_mins: null
          }
        ]
      }
    ]
  }
};

// ===================================================================
// EXAMPLE 3: Removalist - BETWEEN_CUSTOMERS_AND_BACK_TO_BASE
// ===================================================================
// Location type: pickup and dropoff
// Travel charging model: BETWEEN_CUSTOMERS_AND_BACK_TO_BASE
// One component:
//   - pricing combination: labor_per_hour_per_person
//     tiers: 1 person 120, 2 person 140, 3 person 200
export const removalistExample3ServiceData: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Premium Removals - Between + Return",
  description: "Premium moving services. Charges between customers and return to base.",
  location_type: LocationType.PICKUP_AND_DROPOFF,
  travel_charging_model: TravelChargingModel.BETWEEN_CUSTOMERS_AND_BACK_TO_BASE,
  pricing_config: {
    components: [
      {
        name: "Labor Cost",
        pricing_combination: PricingCombination.LABOR_PER_HOUR_TEAM_RATE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 120.00,
            duration_estimate_mins: 150
          },
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 140.00,
            duration_estimate_mins: 100
          },
          {
            min_quantity: 3,
            max_quantity: 3,
            price: 200.00,
            duration_estimate_mins: 80
          }
        ]
      }
    ]
  }
};

// ===================================================================
// EXAMPLE 4: Removalist - FULL_ROUTE
// ===================================================================
// Location type: pickup and dropoff
// Travel charging model: FULL_ROUTE
// Two components:
//   - pricing combination: labor_per_hour_per_person
//   - pricing combination: labor_per_minute_per_person
export const removalistExample4ServiceData: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Express Removals - Full Route",
  description: "Express moving services. Charges for entire route including return.",
  location_type: LocationType.PICKUP_AND_DROPOFF,
  travel_charging_model: TravelChargingModel.FULL_ROUTE,
  pricing_config: {
    components: [
      {
        name: "Hourly Labor",
        pricing_combination: PricingCombination.LABOR_PER_HOUR_TEAM_RATE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 110.00,
            duration_estimate_mins: 120
          },
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 160.00,
            duration_estimate_mins: 90
          },
          {
            min_quantity: 3,
            max_quantity: 3,
            price: 210.00,
            duration_estimate_mins: 60
          }
        ]
      },
      {
        name: "Per-Minute Labor",
        pricing_combination: PricingCombination.LABOR_PER_MINUTE_TEAM_RATE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 2.00,
            duration_estimate_mins: null
          },
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 3.00,
            duration_estimate_mins: null
          },
          {
            min_quantity: 3,
            max_quantity: 3,
            price: 4.00,
            duration_estimate_mins: null
          }
        ]
      }
    ]
  }
};

// ===================================================================
// EXAMPLE 5: Mobile Manicurist - Multiple services, one component each
// ===================================================================
// Service 1: location type: customer, travel charging model: FROM_BASE_TO_CUSTOMERS
// One component: pricing combination: service_fixed_per_service
// Service 2: location type: customer, travel charging model: FROM_BASE_TO_CUSTOMERS
// One component: pricing combination: service_fixed_per_service
export const manicuristExample5Service1Data: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Basic Manicure",
  description: "Basic manicure service at customer location.",
  location_type: LocationType.CUSTOMER,
  travel_charging_model: TravelChargingModel.FROM_BASE_TO_CUSTOMERS,
  pricing_config: {
    components: [
      {
        name: "Manicure Service",
        pricing_combination: PricingCombination.SERVICE_FIXED_PER_SERVICE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 45.00,
            duration_estimate_mins: 45
          }
        ]
      }
    ]
  }
};

export const manicuristExample5Service2Data: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Gel Manicure",
  description: "Gel manicure service at customer location.",
  location_type: LocationType.CUSTOMER,
  travel_charging_model: TravelChargingModel.FROM_BASE_TO_CUSTOMERS,
  pricing_config: {
    components: [
      {
        name: "Gel Manicure Service",
        pricing_combination: PricingCombination.SERVICE_FIXED_PER_SERVICE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 65.00,
            duration_estimate_mins: 60
          }
        ]
      }
    ]
  }
};

// ===================================================================
// EXAMPLE 6: Mobile Manicurist - One service, multiple components
// ===================================================================
// Service 1: location type: customer, travel charging model: FROM_BASE_TO_CUSTOMERS
// Two components:
//   - pricing combination: service_fixed_per_service
//   - pricing combination: travel_per_minute
export const manicuristExample6ServiceData: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Premium Manicure with Travel",
  description: "Premium manicure service with separate travel charging.",
  location_type: LocationType.CUSTOMER,
  travel_charging_model: TravelChargingModel.FROM_BASE_TO_CUSTOMERS,
  pricing_config: {
    components: [
      {
        name: "Premium Manicure",
        pricing_combination: PricingCombination.SERVICE_FIXED_PER_SERVICE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 80.00,
            duration_estimate_mins: 75
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
            price: 1.20,
            duration_estimate_mins: null
          }
        ]
      }
    ]
  }
};

// ===================================================================
// EXAMPLE 7: Mobile Manicurist - Multiple services, multiple components
// ===================================================================
// Service 1: location type: customer, travel charging model: FROM_BASE_TO_CUSTOMERS
// Two components:
//   - pricing combination: service_fixed_per_service (manicure)
//   - pricing combination: service_fixed_per_service (callout)
// Service 2: location type: customer, travel charging model: FROM_BASE_TO_CUSTOMERS
// Two components:
//   - pricing combination: service_fixed_per_service (pedicure)
//   - pricing combination: service_fixed_per_service (callout)
export const manicuristExample7Service1Data: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Manicure + Callout",
  description: "Manicure service with separate callout fee.",
  location_type: LocationType.CUSTOMER,
  travel_charging_model: TravelChargingModel.FROM_BASE_TO_CUSTOMERS,
  pricing_config: {
    components: [
      {
        name: "Manicure",
        pricing_combination: PricingCombination.SERVICE_FIXED_PER_SERVICE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 50.00,
            duration_estimate_mins: 45
          }
        ]
      },
      {
        name: "Callout Fee",
        pricing_combination: PricingCombination.SERVICE_FIXED_PER_SERVICE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 25.00,
            duration_estimate_mins: 15
          }
        ]
      }
    ]
  }
};

export const manicuristExample7Service2Data: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Pedicure + Callout",
  description: "Pedicure service with separate callout fee.",
  location_type: LocationType.CUSTOMER,
  travel_charging_model: TravelChargingModel.FROM_BASE_TO_CUSTOMERS,
  pricing_config: {
    components: [
      {
        name: "Pedicure",
        pricing_combination: PricingCombination.SERVICE_FIXED_PER_SERVICE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 60.00,
            duration_estimate_mins: 60
          }
        ]
      },
      {
        name: "Callout Fee",
        pricing_combination: PricingCombination.SERVICE_FIXED_PER_SERVICE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 25.00,
            duration_estimate_mins: 15
          }
        ]
      }
    ]
  }
};

// ===================================================================
// EXAMPLE 8: Mobile and Non-Mobile Manicurist - Multiple services, multiple components
// ===================================================================
// Service 1: location type: business
// Pricing combination: service_fixed_per_service
// Service 2: location type: customer, travel charging model: FROM_BASE_TO_CUSTOMERS
// Two components:
//   - pricing combination: service_fixed_per_service
//   - pricing combination: travel_per_hour
export const manicuristExample8Service1Data: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "In-Salon Manicure",
  description: "Manicure service at our salon location.",
  location_type: LocationType.BUSINESS,
  pricing_config: {
    components: [
      {
        name: "Salon Manicure",
        pricing_combination: PricingCombination.SERVICE_FIXED_PER_SERVICE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 40.00,
            duration_estimate_mins: 45
          }
        ]
      }
    ]
  }
};

export const manicuristExample8Service2Data: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Mobile Manicure with Hourly Travel",
  description: "Mobile manicure service with hourly travel fee.",
  location_type: LocationType.CUSTOMER,
  travel_charging_model: TravelChargingModel.FROM_BASE_TO_CUSTOMERS,
  pricing_config: {
    components: [
      {
        name: "Mobile Manicure",
        pricing_combination: PricingCombination.SERVICE_FIXED_PER_SERVICE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 55.00,
            duration_estimate_mins: 45
          }
        ]
      },
      {
        name: "Travel Fee",
        pricing_combination: PricingCombination.TRAVEL_PER_MINUTE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 120,
            price: 0.80,
            duration_estimate_mins: null
          }
        ]
      }
    ]
  }
};

// ===================================================================
// EXAMPLE 9: Massage (Non-Mobile) - Multiple services at business location
// ===================================================================
// Service 1: location type: business
// Pricing combination: service_fixed_per_service
// Service 2: location type: business
// Pricing combination: service_fixed_per_service
export const massageExample9Service1Data: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "60-Minute Relaxation Massage",
  description: "Full body relaxation massage at our spa.",
  location_type: LocationType.BUSINESS,
  pricing_config: {
    components: [
      {
        name: "Massage Service",
        pricing_combination: PricingCombination.SERVICE_FIXED_PER_SERVICE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 120.00,
            duration_estimate_mins: 60
          }
        ]
      }
    ]
  }
};

export const massageExample9Service2Data: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "90-Minute Deep Tissue Massage",
  description: "Extended deep tissue massage at our spa.",
  location_type: LocationType.BUSINESS,
  pricing_config: {
    components: [
      {
        name: "Deep Tissue Massage",
        pricing_combination: PricingCombination.SERVICE_FIXED_PER_SERVICE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 160.00,
            duration_estimate_mins: 90
          }
        ]
      }
    ]
  }
};

// ===================================================================
// SKEDY AI AGENT SERVICE - Pay-as-you-go
// ===================================================================
// Service: AI phone agent service
// Location type: business (virtual service)
// Pricing: $0.60 per minute of call time
export const skedyAIAgentServiceData: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "AI Phone Agent Service",
  description: "24/7 AI agent that answers your business calls, provides quotes, and books appointments. Pay only for actual call time - no monthly fees, no setup costs.",
  how_it_works: "Our AI agent answers your business phone calls professionally, understands your services and pricing, provides instant quotes to customers, and books appointments directly into your calendar. You only pay for the minutes the AI agent spends on calls - no hidden fees or monthly subscriptions.",
  location_type: LocationType.BUSINESS, // Virtual service
  pricing_config: {
    components: [
      {
        name: "Call Time",
        pricing_combination: PricingCombination.SERVICE_PER_MINUTE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 500, // Lite tier: 0-500 minutes
            price: 0.38,
            duration_estimate_mins: null // Variable duration
          },
          {
            min_quantity: 501,
            max_quantity: 1500, // Standard tier: 501-1,500 minutes
            price: 0.34,
            duration_estimate_mins: null // Variable duration
          },
          {
            min_quantity: 1501,
            max_quantity: 10000, // Pro tier: 1,501+ minutes
            price: 0.30,
            duration_estimate_mins: null // Variable duration
          }
        ]
      }
    ]
  }
};
