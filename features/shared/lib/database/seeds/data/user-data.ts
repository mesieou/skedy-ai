import type { CreateUserData } from '../../types/user';
import { UserRole } from '../../types/user';

// Helper function to generate unique test data for parallel test execution
function generateUniqueIdentifier(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Function to create unique admin/provider user data for tests
export function createUniqueAdminProviderUserData(businessId: string): CreateUserData {
  const uniqueId = generateUniqueIdentifier();
  return {
    role: UserRole.ADMIN_PROVIDER,
    first_name: "David",
    business_id: businessId,
    last_name: "Smith",
    phone_number: `+61411${Math.floor(Math.random() * 900000) + 100000}`,
    email: `david+${uniqueId}@tigapropertyservices.com`,
  };
}

// Function to create unique provider user data for tests
export function createUniqueProviderUserData(businessId: string): CreateUserData {
  const uniqueId = generateUniqueIdentifier();
  return {
    role: UserRole.PROVIDER,
    first_name: "Sarah",
    business_id: businessId,
    last_name: "Johnson",
    phone_number: `+61412${Math.floor(Math.random() * 900000) + 100000}`,
    email: `sarah+${uniqueId}@tigapropertyservices.com`,
  };
}

// Function to create unique customer user data for tests
export function createUniqueCustomerUserData(businessId: string): CreateUserData {
  const uniqueId = generateUniqueIdentifier();
  return {
    role: UserRole.CUSTOMER,
    first_name: "Mike",
    business_id: businessId,
    last_name: "Wilson",
    phone_number: `+61423${Math.floor(Math.random() * 900000) + 100000}`,
    email: `mike.wilson+${uniqueId}@gmail.com`,
  };
}


