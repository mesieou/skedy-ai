import { BaseEntity } from "./base";

// Slot format with precomputed timestamps for performance
export type AvailabilitySlot = [string, number, number]; // [time, count, timestampMs]

export interface AvailabilitySlots extends BaseEntity {
  slots: {
    [dateKey: string]: {
      [durationKey: string]: AvailabilitySlot[];
    };
  };
  business_id: string;
}

export type CreateAvailabilitySlotsData = Omit<AvailabilitySlots, 'id' | 'created_at' | 'updated_at'>;
export type UpdateAvailabilitySlotsData = Partial<Omit<AvailabilitySlots, 'id' | 'created_at'>>;
