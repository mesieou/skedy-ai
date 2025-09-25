import type { CreateAuthUserData } from '../../types/auth-user';

// Helper function to generate unique test data for parallel test execution
function generateUniqueIdentifier(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Function to create unique admin auth user data for tests
export function createUniqueAdminAuthUserData(): CreateAuthUserData {
  const uniqueId = generateUniqueIdentifier();
  return {
    email: `admin+${uniqueId}@test.com`,
    password: "TestPassword123!",
    email_confirm: true
  };
}

// Function to create unique provider auth user data for tests
export function createUniqueProviderAuthUserData(): CreateAuthUserData {
  const uniqueId = generateUniqueIdentifier();
  return {
    email: `provider+${uniqueId}@test.com`,
    password: "TestPassword123!",
    email_confirm: true
  };
}

// Function to create unique customer auth user data for tests
export function createUniqueCustomerAuthUserData(): CreateAuthUserData {
  const uniqueId = generateUniqueIdentifier();
  return {
    email: `customer+${uniqueId}@test.com`,
    password: "TestPassword123!",
    email_confirm: true
  };
}

// Function to create super admin auth user data
export function createSuperAdminAuthUserData(): CreateAuthUserData {
  return {
    email: "info@skedy.io",
    password: "skedy1010",
    email_confirm: true
  };
}

// Demo business owner auth user data functions
export function createRemovalistOwnerAuthUserData(): CreateAuthUserData {
  return {
    email: "edward@tigapropertyservices.com",
    password: "demo123",
    email_confirm: true
  };
}

export function createManicuristOwnerAuthUserData(): CreateAuthUserData {
  return {
    email: "sarah@nailsonthego.com.au",
    password: "demo123",
    email_confirm: true
  };
}

export function createPlumberOwnerAuthUserData(): CreateAuthUserData {
  return {
    email: "mike@fixitplumbing.com.au",
    password: "demo123",
    email_confirm: true
  };
}
