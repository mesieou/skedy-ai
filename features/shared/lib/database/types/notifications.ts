import { BaseEntity } from "./base";

// Notification enums
export enum DeliveryMethod {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push'
}

export enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced'
}

export enum NotificationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

export interface Notification extends BaseEntity {
  sent_at?: string | null;
  user_id: string;
  business_id: string;
  content: string;
  delivery_method: DeliveryMethod;
  delivery_status: DeliveryStatus;
  status: NotificationStatus;
  booking_id?: string | null;
  chat_session_id?: string | null;
}

export type CreateNotificationData = Omit<Notification, 'id' | 'created_at' | 'updated_at'>;
export type UpdateNotificationData = Partial<Omit<Notification, 'id' | 'created_at'>>;
