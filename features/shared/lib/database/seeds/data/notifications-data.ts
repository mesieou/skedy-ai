import type { CreateNotificationData } from '../../types/notifications';
import { DeliveryMethod, DeliveryStatus, NotificationStatus } from '../../types/notifications';

// Basic notification for booking confirmations
export const bookingConfirmationNotificationData: CreateNotificationData = {
  sent_at: null,
  user_id: "placeholder-user-id", // Will be replaced with actual user_id
  business_id: "placeholder-business-id", // Will be replaced with actual business_id
  content: "Your booking has been confirmed. We'll send you a reminder 24 hours before your appointment.",
  delivery_method: DeliveryMethod.EMAIL,
  delivery_status: DeliveryStatus.PENDING,
  status: NotificationStatus.ACTIVE,
  booking_id: "placeholder-booking-id",
  chat_session_id: null
};