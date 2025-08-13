import { BaseEntity } from "./base";

export interface AvailabilitySlots extends BaseEntity {
  slots: {
    [dateKey: string]: {
      [durationKey: string]: [string, number][];
    };
  };
  business_id: string;
}

export type CreateAvailabilitySlotsData = Omit<AvailabilitySlots, 'id' | 'created_at' | 'updated_at'>;
export type UpdateAvailabilitySlotsData = Partial<Omit<AvailabilitySlots, 'id' | 'created_at'>>;
