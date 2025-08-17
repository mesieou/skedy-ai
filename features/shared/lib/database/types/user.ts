import { BaseEntity } from "./base";

export enum UserRole {
  ADMIN = 'admin',
  PROVIDER = 'provider',
  ADMIN_PROVIDER = 'admin/provider',
  CUSTOMER = 'customer'
}

// Dynamic array of provider roles - automatically includes all provider-type roles
export const PROVIDER_ROLES = [
  UserRole.PROVIDER,
  UserRole.ADMIN_PROVIDER
] as const;

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