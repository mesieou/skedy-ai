import { BaseEntity } from "./base";

export interface WaitListContact extends BaseEntity {
  name: string;
  email: string;
  phone_number: string;
  address?: string | null;
}

export type CreateWaitListContactData = Omit<WaitListContact, 'id' | 'created_at' | 'updated_at'>;
export type UpdateWaitListContactData = Partial<Omit<WaitListContact, 'id' | 'created_at'>>;
