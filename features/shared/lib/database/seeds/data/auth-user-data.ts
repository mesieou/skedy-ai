import type { CreateAuthUserData } from '../../types/auth-user';

// Admin auth user data
export const adminAuthUserData: CreateAuthUserData = {
  email: "admin@test.com",
  password: "TestPassword123!",
  email_confirm: true
};

// Provider auth user data
export const providerAuthUserData: CreateAuthUserData = {
  email: "provider@test.com",
  password: "TestPassword123!",
  email_confirm: true
};

// Customer auth user data
export const customerAuthUserData: CreateAuthUserData = {
  email: "customer@test.com",
  password: "TestPassword123!",
  email_confirm: true
};
// Export all auth users as an array for easy iteration
export const allAuthUsersData = [
  adminAuthUserData,
  providerAuthUserData,
  customerAuthUserData,
];

