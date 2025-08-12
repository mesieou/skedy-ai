import { BaseEntity } from "./base";

export interface Address extends BaseEntity {
  service_id: string;
  type: string;
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  postcode: string;
  state?: string | null;
  country: string;
}

export type CreateAddressData = Omit<Address, 'id' | 'created_at' | 'updated_at'>;
export type UpdateAddressData = Partial<Omit<Address, 'id' | 'created_at'>>;
