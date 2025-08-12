import { BaseEntity } from "./base";

export interface CalendarSettings extends BaseEntity {
  user_id: string;
  settings: Record<string, unknown>;
  working_hours: Record<string, unknown>;
  calendar_id?: string | null;
  calendar_type?: string | null;
}

export type CreateCalendarSettingsData = Omit<CalendarSettings, 'id' | 'created_at' | 'updated_at'>;
export type UpdateCalendarSettingsData = Partial<Omit<CalendarSettings, 'id' | 'created_at'>>;
