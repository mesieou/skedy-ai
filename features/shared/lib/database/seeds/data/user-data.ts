import type { CreateUserData } from '../../types/user';
import { UserRole } from '../../types/user';

// Admin/Provider user
export const adminProviderUserData: CreateUserData = {
  role: UserRole.ADMIN_PROVIDER,
  first_name: "David",
  business_id: "placeholder-business-id", // Will be replaced with actual business_id in tests
  last_name: "Smith",
  phone_number: "+61411851098",
  email: "david@tigapropertyservices.com",
};

// Provider only user
export const providerUserData: CreateUserData = {
  role: UserRole.PROVIDER,
  first_name: "Sarah",
  business_id: "placeholder-business-id", // Will be replaced with actual business_id in tests
  last_name: "Johnson",
  phone_number: "+61412345678",
  email: "sarah@tigapropertyservices.com",
};

// Customer user
export const customerUserData: CreateUserData = {
  role: UserRole.CUSTOMER,
  first_name: "Mike",
  business_id: "placeholder-business-id", // Will be replaced with actual business_id in tests
  last_name: "Wilson",
  phone_number: "+61423456789",
  email: "mike.wilson@gmail.com",
};

// Export all users as an array for easy iteration
export const allUsersData = [
  adminProviderUserData,
  providerUserData,
  customerUserData,
];

// Legacy export for backward compatibility
export const userData = adminProviderUserData;