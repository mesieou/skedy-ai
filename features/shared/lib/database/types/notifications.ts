import { BaseEntity } from "./base";

export interface Notification extends BaseEntity {
  sent_at?: string | null;
  user_id: string;
  business_id: string;
  content: string;
  delivery_method: 'email' | 'sms' | 'push';
  delivery_status: string;
  status: 'active' | 'inactive';
  booking_id?: string | null;
  chat_session_id?: string | null;
}

export type CreateNotificationData = Omit<Notification, 'id' | 'created_at' | 'updated_at'>;
export type UpdateNotificationData = Partial<Omit<Notification, 'id' | 'created_at'>>;
