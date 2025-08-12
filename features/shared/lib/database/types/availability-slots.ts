import { BaseEntity } from "./base";

export interface AvailabilitySlot extends BaseEntity {
  date: string;
  slots: Record<string, unknown>;
  business_id: string;
}

export type CreateAvailabilitySlotData = Omit<AvailabilitySlot, 'id' | 'created_at' | 'updated_at'>;
export type UpdateAvailabilitySlotData = Partial<Omit<AvailabilitySlot, 'id' | 'created_at'>>;
