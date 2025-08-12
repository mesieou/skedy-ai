import type { CreatePriceComponentTierData } from '../../types/price-component-tiers';

// Fixed pricing - simple duration_estimate_mins
export const fixedServiceTierData: CreatePriceComponentTierData = {
  price_component_id: "placeholder-component-id", // Will be replaced with actual component_id
  min_quantity: 1,
  max_quantity: 1,
  price: 150.00,
  duration_estimate_mins: 60 // Simple number for fixed services
};

// Hourly pricing - complex duration_estimate_mins based on job type
export const hourlyServiceTierData: CreatePriceComponentTierData = {
  price_component_id: "placeholder-component-id",
  min_quantity: 1,
  max_quantity: 3,
  price: 120.00,
  duration_estimate_mins: {
    "one_item": 40,
    "multiple_items": 60,
    "house_move_one_room": 120,
    "house_move_two_rooms": 160,
    "house_move_three_rooms": 240
  }
};

// Per minute pricing - different times for different scenarios
export const perMinuteServiceTierData: CreatePriceComponentTierData = {
  price_component_id: "placeholder-component-id",
  min_quantity: 1,
  max_quantity: 1, 
  price: 2.50,
  duration_estimate_mins: {
    "small_box": 5,
    "medium_box": 10,
    "large_item": 20,
    "furniture_piece": 30
  }
};
