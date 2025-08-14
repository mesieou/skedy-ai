import type { CreateBookingData } from '../../types/bookings';
import { BookingStatus } from '../../types/bookings';
import { PricingCombination } from '../../types/service';

// Test booking data for seeding
export const defaultBookingData: CreateBookingData = {
  user_id: "placeholder-user-id", // Will be replaced with actual user_id
  business_id: "placeholder-business-id", // Will be replaced with actual business_id
  status: BookingStatus.NOT_ACCEPTED,
  total_estimate_amount: 45000, // $450.00 in cents
  total_estimate_time_in_minutes: 270, // 4.5 hours
  start_at: "2024-03-15T10:00:00.000Z", // UTC ISO string
  end_at: "2024-03-15T14:30:00.000Z",   // UTC ISO string
  deposit_amount: 13500, // $135 deposit (30%)
  remaining_balance: 45000,
  deposit_paid: false,
  price_breakdown: {
    service_breakdowns: [
      {
        service_id: "service-cleaning",
        service_name: "House Cleaning",
        quantity: 1,
        base_cost: 40000,
        travel_cost: 2000,
        setup_cost: 1000,
        surge_cost: 0,
        total_cost: 43000,
        estimated_duration_mins: 270,
        component_breakdowns: [
          {
            component_name: "Cleaning Service",
            pricing_combination: PricingCombination.SERVICE_PER_HOUR_PER_PERSON,
            tier_used: {
              min_quantity: 1,
              max_quantity: 1, 
              price: 40000,
              duration_estimate_mins: 240
            },
            base_calculation: "4 hours × 1 person × $100",
            cost: 40000,
            duration_mins: 240
          },
          {
            component_name: "Setup Fee",
            pricing_combination: PricingCombination.SERVICE_FIXED_PER_SERVICE,
            tier_used: {
              min_quantity: 1,
              max_quantity: 1,
              price: 1000,
              duration_estimate_mins: 30
            },
            base_calculation: "1 × setup fee",
            cost: 1000,
            duration_mins: 30
          },
          {
            component_name: "Travel Cost",
            pricing_combination: PricingCombination.TRAVEL_PER_KM,
            tier_used: {
              min_quantity: 1,
              max_quantity: 1,
              price: 200,
              duration_estimate_mins: 0
            },
            base_calculation: "10 km × $20",
            cost: 2000,
            duration_mins: 0
          }
        ]
      }
    ],
    travel_breakdown: {
      total_distance_km: 10.0,
      total_travel_time_mins: 15,
      total_travel_cost: 2000,
      route_segments: [
        {
          from_address: "Business Base, Melbourne",
          to_address: "123 Main St, Melbourne",
          distance_km: 10.0,
          duration_mins: 15,
          cost: 2000,
          is_chargeable: true,
          segment_type: "base_to_customer"
        }
      ],
      free_travel_applied: false,
      free_travel_distance_km: 0
    },
    business_fees: {
      gst_amount: 4091, // 10% GST
      platform_fee: 900, // 2% platform fee
      payment_processing_fee: 1305, // 2.9% processing fee
      other_fees: []
    }
  }
};

export const acceptedBookingData: CreateBookingData = {
  user_id: "placeholder-user-id",
  business_id: "placeholder-business-id", 
  status: BookingStatus.ACCEPTED,
  total_estimate_amount: 68000, // $680.00 in cents
  total_estimate_time_in_minutes: 360, // 6 hours
  start_at: "2024-03-16T08:00:00.000Z", // UTC ISO string
  end_at: "2024-03-16T14:00:00.000Z",   // UTC ISO string
  deposit_amount: 20400, // $204 deposit (30%)
  remaining_balance: 68000,
  deposit_paid: false,
  price_breakdown: {
    service_breakdowns: [
      {
        service_id: "service-removal",
        service_name: "House Removal",
        quantity: 3,
        base_cost: 60000,
        travel_cost: 4000,
        setup_cost: 0,
        surge_cost: 0,
        total_cost: 64000,
        estimated_duration_mins: 360,
        component_breakdowns: [
          {
            component_name: "Hourly Rate", 
            pricing_combination: PricingCombination.LABOR_PER_HOUR_PER_PERSON,
            tier_used: {
              min_quantity: 2,
              max_quantity: 3,
              price: 100,
              duration_estimate_mins: 120
            },
            base_calculation: "6 hours × 3 people × $33.33",
            cost: 60000,
            duration_mins: 360
          },
          {
            component_name: "Distance Fee",
            pricing_combination: PricingCombination.TRAVEL_PER_KM,
            tier_used: {
              min_quantity: 1,
              max_quantity: 1,
              price: 200,
              duration_estimate_mins: 0
            },
            base_calculation: "20 km × $20", 
            cost: 4000,
            duration_mins: 0
          }
        ]
      }
    ],
    travel_breakdown: {
      total_distance_km: 20.0,
      total_travel_time_mins: 25,
      total_travel_cost: 4000,
      route_segments: [
        {
          from_address: "456 Oak St, Melbourne",
          to_address: "789 Pine Ave, Melbourne",
          distance_km: 20.0,
          duration_mins: 25,
          cost: 4000,
          is_chargeable: true,
          segment_type: "customer_to_customer"
        }
      ],
      free_travel_applied: false,
      free_travel_distance_km: 0
    },
    business_fees: {
      gst_amount: 6182, // 10% GST
      platform_fee: 1360, // 2% platform fee
      payment_processing_fee: 1972, // 2.9% processing fee
      other_fees: []
    }
  }
};
