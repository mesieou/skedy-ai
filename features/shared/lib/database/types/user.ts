import { BaseEntity } from "./base";

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
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

// Admin roles that can manage businesses
export const ADMIN_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.ADMIN_PROVIDER
] as const;

// Role hierarchy helpers
export const isSuperAdmin = (role: UserRole): boolean => role === UserRole.SUPER_ADMIN;
export const isAdmin = (role: UserRole): boolean => ADMIN_ROLES.includes(role as any);
export const isProvider = (role: UserRole): boolean => PROVIDER_ROLES.includes(role as any);

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
