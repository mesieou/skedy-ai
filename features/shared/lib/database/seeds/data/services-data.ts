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
export const removalistTigaService1Data: CreateServiceData = {
  business_id: "placeholder-business-id", // Will be replaced with actual business_id
  name: "One bedroon and furniture(one or few items) relocation",
  description: "Professional one bedroon house/apartment and furniture relocation services.",
  how_it_works: "We send a team with a 4 tonne truck to pick up your items from the pickup location, transport them safely, and deliver to your dropoff location. You don't lift a finger - we handle all the heavy lifting, packing protection, and careful placement at the destination.",
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
            price: 100.00,
            duration_estimate_mins: {
              "one_item": 40,
              "few_items": 60,
              "house_move_1_bedroom": 120,
              // "house_move_2_bedroom": 180,
              // "house_move_3_bedroom": 240,
              // "office_move_small": 180,
              // "office_move_medium": 360
            }
          },
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 150.00,
            duration_estimate_mins: {
              "one_item": 40,
              "few_items": 60,
              "house_move_1_bedroom": 120,
              // "house_move_2_bedroom": 180,
              // "house_move_3_bedroom": 240,
              // "office_move_small": 180,
              // "office_move_medium": 360
            }
          },
          {
            min_quantity: 3,
            max_quantity: 3,
            price: 190.00,
            duration_estimate_mins: {
              "one_item": 40,
              "few_items": 60,
              "house_move_1_bedroom": 120,
              // "house_move_2_bedroom": 180,
              // "house_move_3_bedroom": 120,
              // "office_move_small": 180,
              // "office_move_medium": 360
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
            price: 100.00,
            duration_estimate_mins: null
          },
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 150.00,
            duration_estimate_mins: null
          },
          {
            min_quantity: 3,
            max_quantity: 3,
            price: 190.00,
            duration_estimate_mins: null
          }
        ]
      }
    ]
  }
};

export const removalistTigaService2Data: CreateServiceData = {
  business_id: "placeholder-business-id", // Will be replaced with actual business_id
  name: "2 bedroom house/apartment and small offices relocation",
  description: "Professional medium house/apartment and small offices relocation services",
  how_it_works: "We send a team with a 6 tonne truck to pick up your items from the pickup location, transport them safely, and deliver to your dropoff location. You don't lift a finger - we handle all the heavy lifting, packing protection, and careful placement at the destination.",
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
            price: 110.00,
            duration_estimate_mins: {
              // "one_item": 40,
              // "few_items": 60,
              // "house_move_1_bedroom": 120,
              "house_move_2_bedroom": 180,
              // "house_move_3_bedroom": 240,
              // "office_move_small": 180,
              "office_move_small": 360
            }
          },
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 160.00,
            duration_estimate_mins: {
              // "one_item": 40,
              // "few_item": 60,
              // "house_move_1_bedroom": 120,
              "house_move_2_bedroom": 180,
              // "house_move_3_bedroom": 240,
              // "office_move_small": 180,
              "office_move_medium": 360
            }
          },
          {
            min_quantity: 3,
            max_quantity: 3,
            price: 200.00,
            duration_estimate_mins: {
              // "one_item": 40,
              // "few_items": 60,
              // "house_move_1_bedroom": 120,
              "house_move_2_bedroom": 180,
              // "house_move_3_bedroom": 120,
              // "office_move_small": 180,
              "office_move_small": 360
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
            price: 110.00,
            duration_estimate_mins: null
          },
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 160.00,
            duration_estimate_mins: null
          },
          {
            min_quantity: 3,
            max_quantity: 3,
            price: 200.00,
            duration_estimate_mins: null
          }
        ]
      }
    ]
  }
};

export const removalistTigaService3Data: CreateServiceData = {
  business_id: "placeholder-business-id", // Will be replaced with actual business_id
  name: "3 bedroom house/apartment and medium offices relocation",
  description: "Professional large house/apartment and medium offices relocation services",
  how_it_works: "We send a team with a 8 tonne truck to pick up your items from the pickup location, transport them safely, and deliver to your dropoff location. You don't lift a finger - we handle all the heavy lifting, packing protection, and careful placement at the destination.",
  location_type: LocationType.PICKUP_AND_DROPOFF,
  travel_charging_model: TravelChargingModel.BETWEEN_CUSTOMERS_AND_BACK_TO_BASE,
  pricing_config: {
    components: [
      {
        name: "Labor Cost",
        pricing_combination: PricingCombination.LABOR_PER_HOUR_TEAM_RATE,
        tiers: [
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 175.00,
            duration_estimate_mins: {
              // "one_item": 40,
              // "few_items": 60,
              // "house_move_1_bedroom": 120,
              // "house_move_2_bedroom": 180,
              "house_move_3_bedroom": 360,
              // "office_move_small": 180,
              "office_move_medium": 360
            }
          },
          {
            min_quantity: 3,
            max_quantity: 3,
            price: 215.00,
            duration_estimate_mins: {
              // "one_item": 40,
              // "few_items": 60,
              // "house_move_1_bedroom": 120,
              // "house_move_2_bedroom": 180,
              "house_move_3_bedroom": 360,
              // "office_move_small": 180,
              "office_move_medium": 360
            }
          }
        ]
      },
      {
        name: "Travel Cost",
        pricing_combination: PricingCombination.TRAVEL_PER_HOUR_TEAM_RATE,
        tiers: [
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 175.00,
            duration_estimate_mins: null
          },
          {
            min_quantity: 3,
            max_quantity: 3,
            price: 215.00,
            duration_estimate_mins: null
          }
        ]
      }
    ]
  }
};


export const removalistTigaService4Data: CreateServiceData = {
  business_id: "placeholder-business-id", // Will be replaced with actual business_id
  name: "4 bedroom house/apartment and large offices relocation",
  description: "Professional large house/apartment and large office relocation services",
  how_it_works: "We send a team with a 10 tonne truck to pick up your items from the pickup location, transport them safely, and deliver to your dropoff location. You don't lift a finger - we handle all the heavy lifting, packing protection, and careful placement at the destination.",
  location_type: LocationType.PICKUP_AND_DROPOFF,
  travel_charging_model: TravelChargingModel.BETWEEN_CUSTOMERS_AND_BACK_TO_BASE,
  pricing_config: {
    components: [
      {
        name: "Labor Cost",
        pricing_combination: PricingCombination.LABOR_PER_HOUR_TEAM_RATE,
        tiers: [
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 185.00,
            duration_estimate_mins: {
              // "one_item": 40,
              // "few_items": 60,
              // "house_move_1_bedroom": 120,
              // "house_move_2_bedroom": 180,
              // "house_move_3_bedroom": 360,
              "house_move_4_bedroom": 360,
              // "office_move_small": 180,
              "office_move_large": 360
            }
          },
          {
            min_quantity: 3,
            max_quantity: 3,
            price: 225.00,
            duration_estimate_mins: {
              // "one_item": 40,
              // "few_items": 60,
              // "house_move_1_bedroom": 120,
              // "house_move_2_bedroom": 180,
              "house_move_4_bedroom": 360,
              // "office_move_small": 180,
              "office_move_large": 360
            }
          }
        ]
      },
      {
        name: "Travel Cost",
        pricing_combination: PricingCombination.TRAVEL_PER_HOUR_TEAM_RATE,
        tiers: [
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 185.00,
            duration_estimate_mins: null
          },
          {
            min_quantity: 3,
            max_quantity: 3,
            price: 225.00,
            duration_estimate_mins: null
          }
        ]
      }
    ]
  }
};

export const removalistTigaService5Data: CreateServiceData = {
  business_id: "placeholder-business-id", // Will be replaced with actual business_id
  name: "5 bedroom house/apartment and massive offices relocation",
  description: "Professional large house/apartment and massive offices relocation services",
  how_it_works: "We send a team with a 12 tonne truck to pick up your items from the pickup location, transport them safely, and deliver to your dropoff location. You don't lift a finger - we handle all the heavy lifting, packing protection, and careful placement at the destination.",
  location_type: LocationType.PICKUP_AND_DROPOFF,
  travel_charging_model: TravelChargingModel.BETWEEN_CUSTOMERS_AND_BACK_TO_BASE,
  pricing_config: {
    components: [
      {
        name: "Labor Cost",
        pricing_combination: PricingCombination.LABOR_PER_HOUR_TEAM_RATE,
        tiers: [
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 195.00,
            duration_estimate_mins: {
              // "one_item": 40,
              // "few_items": 60,
              // "house_move_1_bedroom": 120,
              // "house_move_2_bedroom": 180,
              // "house_move_3_bedroom": 360,
              // "house_move_4_bedroom": 360,
              "house_move_5_bedroom": 360,
              // "office_move_small": 180,
              "office_move_massive": 360
            }
          },
          {
            min_quantity: 3,
            max_quantity: 3,
            price: 235.00,
            duration_estimate_mins: {
              // "one_item": 40,
              // "few_items": 60,
              // "house_move_1_bedroom": 120,
              // "house_move_2_bedroom": 180,
              "house_move_5_bedroom": 360,
              // "office_move_small": 180,
              "office_move_massive": 360
            }
          }
        ]
      },
      {
        name: "Travel Cost",
        pricing_combination: PricingCombination.TRAVEL_PER_HOUR_TEAM_RATE,
        tiers: [
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 195.00,
            duration_estimate_mins: null
          },
          {
            min_quantity: 3,
            max_quantity: 3,
            price: 235.00,
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
// MAN WITH A VAN SERVICES - Item-based removals (API pricing)
// ===================================================================
// Note: MWAV uses item-based pricing with day-of-week rates
// These services are for display only - actual pricing comes from MWAV API

export const mwavMediumTruckService: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Medium Truck + 2 Movers",
  description: "Our Medium trucks can manage a student apartment, small office or a bouncing baby hippo",
  how_it_works: "Book for as little as 30 minutes plus travel for fully trained charming movers. Fully insured at no extra cost. Only pay on completion.",
  location_type: LocationType.PICKUP_AND_DROPOFF,
  travel_charging_model: TravelChargingModel.FROM_BASE_TO_CUSTOMERS_AND_BACK_TO_BASE,
  pricing_config: {
    components: [
      {
        name: "Moving Service",
        pricing_combination: PricingCombination.LABOR_PER_HOUR_TEAM_RATE,
        tiers: [
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 217.00,
            day_type: 'weekday'
          },
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 236.00,
            day_type: 'saturday'
          },
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 275.00,
            day_type: 'sunday'
          },
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 344.00,
            day_type: 'public_holiday'
          }
        ]
      }
    ]
  }
};

export const mwavLargeTruckService: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Large Truck + 2 Movers",
  description: "Our Large trucks can handle a two-bedroom house, averaged-sized office or an annoyed juvenile elephant",
  how_it_works: "Book for as little as 30 minutes plus travel for fully trained charming movers. Fully insured at no extra cost. Only pay on completion.",
  location_type: LocationType.PICKUP_AND_DROPOFF,
  travel_charging_model: TravelChargingModel.FROM_BASE_TO_CUSTOMERS_AND_BACK_TO_BASE,
  pricing_config: {
    components: [
      {
        name: "Moving Service",
        pricing_combination: PricingCombination.LABOR_PER_HOUR_TEAM_RATE,
        tiers: [
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 241.00,
            day_type: 'weekday'
          },
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 262.00,
            day_type: 'saturday'
          },
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 300.00,
            day_type: 'sunday'
          },
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 392.00,
            day_type: 'public_holiday'
          }
        ]
      }
    ]
  }
};

export const mwavXLTruck2MoversService: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "XL Truck + 2 Movers",
  description: "Our Extra Large trucks can fit a full family home, large office or two reincarnated woolly mammoths",
  how_it_works: "Book for as little as 30 minutes plus travel for fully trained charming movers. Fully insured at no extra cost. Only pay on completion.",
  location_type: LocationType.PICKUP_AND_DROPOFF,
  travel_charging_model: TravelChargingModel.FROM_BASE_TO_CUSTOMERS_AND_BACK_TO_BASE,
  pricing_config: {
    components: [
      {
        name: "Moving Service",
        pricing_combination: PricingCombination.LABOR_PER_HOUR_TEAM_RATE,
        tiers: [
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 276.00,
            day_type: 'weekday'
          },
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 299.00,
            day_type: 'saturday'
          },
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 344.00,
            day_type: 'sunday'
          },
          {
            min_quantity: 2,
            max_quantity: 2,
            price: 445.00,
            day_type: 'public_holiday'
          }
        ]
      }
    ]
  }
};

export const mwavXLTruck3MoversService: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "XL Truck + 3 Movers",
  description: "Our Extra Large trucks with 3 movers can fit a full family home, large office or two reincarnated woolly mammoths",
  how_it_works: "Book for as little as 30 minutes plus travel for fully trained charming movers. Fully insured at no extra cost. Only pay on completion.",
  location_type: LocationType.PICKUP_AND_DROPOFF,
  travel_charging_model: TravelChargingModel.FROM_BASE_TO_CUSTOMERS_AND_BACK_TO_BASE,
  pricing_config: {
    components: [
      {
        name: "Moving Service",
        pricing_combination: PricingCombination.LABOR_PER_HOUR_TEAM_RATE,
        tiers: [
          {
            min_quantity: 3,
            max_quantity: 3,
            price: 329.00,
            day_type: 'weekday'
          },
          {
            min_quantity: 3,
            max_quantity: 3,
            price: 377.00,
            day_type: 'saturday'
          },
          {
            min_quantity: 3,
            max_quantity: 3,
            price: 419.00,
            day_type: 'sunday'
          },
          {
            min_quantity: 3,
            max_quantity: 3,
            price: 534.00,
            day_type: 'public_holiday'
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

// ===================================================================
// PLUMBER SERVICES (Examples 9-10)
// ===================================================================

export const plumberEmergencyServiceData: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "Emergency Plumbing Callout",
  description: "24/7 emergency plumbing service for urgent repairs.",
  how_it_works: "We respond to your emergency plumbing needs within 1 hour. Our qualified plumber will diagnose the issue, provide a quote, and fix the problem on the spot when possible.",
  location_type: LocationType.CUSTOMER,
  travel_charging_model: TravelChargingModel.FROM_BASE_TO_CUSTOMERS,
  pricing_config: {
    components: [
      {
        name: "Emergency Callout Fee",
        pricing_combination: PricingCombination.SERVICE_FIXED_PER_SERVICE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 120.00,
            duration_estimate_mins: {
              "blocked_drain": 60,
              "leaking_tap": 30,
              "burst_pipe": 90,
              "hot_water_system": 120,
              "toilet_repair": 45
            }
          }
        ]
      },
      {
        name: "Hourly Labor",
        pricing_combination: PricingCombination.LABOR_PER_HOUR_PER_PERSON,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 95.00,
            duration_estimate_mins: {
              "blocked_drain": 60,
              "leaking_tap": 30,
              "burst_pipe": 90,
              "hot_water_system": 120,
              "toilet_repair": 45
            }
          }
        ]
      }
    ]
  }
};

export const plumberMaintenanceServiceData: CreateServiceData = {
  business_id: "placeholder-business-id",
  name: "General Plumbing Maintenance",
  description: "Regular plumbing maintenance and non-emergency repairs.",
  how_it_works: "Schedule a convenient time for our plumber to visit and handle your plumbing maintenance needs. Perfect for non-urgent repairs, installations, and routine maintenance.",
  location_type: LocationType.CUSTOMER,
  travel_charging_model: TravelChargingModel.FROM_BASE_TO_CUSTOMERS,
  pricing_config: {
    components: [
      {
        name: "Service Call",
        pricing_combination: PricingCombination.SERVICE_FIXED_PER_SERVICE,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 80.00,
            duration_estimate_mins: {
              "tap_installation": 45,
              "toilet_installation": 90,
              "pipe_repair": 60,
              "maintenance_check": 30
            }
          }
        ]
      },
      {
        name: "Labor Cost",
        pricing_combination: PricingCombination.LABOR_PER_HOUR_PER_PERSON,
        tiers: [
          {
            min_quantity: 1,
            max_quantity: 1,
            price: 85.00,
            duration_estimate_mins: {
              "tap_installation": 45,
              "toilet_installation": 90,
              "pipe_repair": 60,
              "maintenance_check": 30
            }
          }
        ]
      }
    ]
  }
};
