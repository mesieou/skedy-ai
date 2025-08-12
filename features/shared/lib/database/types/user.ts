import { BaseEntity } from "./base";

export enum UserRole {
  ADMIN = 'admin',
  PROVIDER = 'provider',
  ADMIN_PROVIDER = 'admin/provider',
  CUSTOMER = 'customer'
}

export interface User extends BaseEntity {
  role: UserRole;
  first_name: string;
  business_id: string;
  last_name?: string | null;
  phone_number?: string | null;
  email?: string | null;
}

export type CreateUserData = Omit<User, 'id' | 'created_at' | 'updated_at'>;
export type UpdateUserData = Partial<Omit<User, 'id' | 'created_at'>>;