import type { CreatePriceComponentTierData } from '../../types/price-component-tiers';

// Hourly pricing - tiered movers
export const hourlyServiceTierDataOneMover: CreatePriceComponentTierData = {
  price_component_id: "placeholder-component-id",
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
};
// Hourly pricing - tiered movers
export const hourlyServiceTierDataTwoMovers: CreatePriceComponentTierData = {
  price_component_id: "placeholder-component-id",
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
};
// Hourly pricing - tiered movers
export const hourlyServiceTierDataThreeMovers: CreatePriceComponentTierData = {
  price_component_id: "placeholder-component-id",
  min_quantity: 3,
  max_quantity: 3,
  price: 185.00,
  duration_estimate_mins: {
    "house_move_one_room": 60,
    "house_move_two_rooms": 80,
    "house_move_three_rooms": 120
  }
};

// Fixed pricing - simple duration_estimate_mins
export const fixedManicureServiceTierData: CreatePriceComponentTierData = {
  price_component_id: "placeholder-component-id", // Will be replaced with actual component_id
  min_quantity: 1,
  max_quantity: 1,
  price: 60.00,
  duration_estimate_mins: 60 // Simple number for fixed services
};
 