import type { CreateBookingData } from '../../types/bookings';

// Test booking data for seeding
export const defaultBookingData: CreateBookingData = {
  user_id: "placeholder-user-id", // Will be replaced with actual user_id
  business_id: "placeholder-business-id", // Will be replaced with actual business_id
  status: "not_accepted",
  total_estimate_amount: 450.00,
  total_estimate_time: 4.5
};

export const acceptedBookingData: CreateBookingData = {
  user_id: "placeholder-user-id",
  business_id: "placeholder-business-id", 
  status: "accepted",
  total_estimate_amount: 680.00,
  total_estimate_time: 6.0
};
