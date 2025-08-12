import type { CreateNotificationData } from '../../types/notifications';

// Test notification data for seeding
export const emailNotificationData: CreateNotificationData = {
  sent_at: null,
  user_id: "placeholder-user-id", // Will be replaced with actual user_id
  business_id: "placeholder-business-id", // Will be replaced with actual business_id
  content: "Your removal booking has been confirmed for tomorrow at 9:00 AM. Our team will arrive 15 minutes early to prepare.",
  delivery_method: "email",
  delivery_status: "pending",
  status: "active",
  booking_id: "placeholder-booking-id",
  chat_session_id: null
};

export const smsNotificationData: CreateNotificationData = {
  sent_at: null,
  user_id: "placeholder-user-id",
  business_id: "placeholder-business-id",
  content: "Reminder: Your removal is scheduled for tomorrow at 9:00 AM. Reply STOP to unsubscribe.",
  delivery_method: "sms",
  delivery_status: "pending", 
  status: "active",
  booking_id: "placeholder-booking-id",
  chat_session_id: null
};
