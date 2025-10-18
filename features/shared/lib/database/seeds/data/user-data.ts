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

// Function to create unique provider user data for tests (generic)
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

// Business-specific provider user data functions
export function createRemovalistProviderUserData(businessId: string): CreateUserData {
  return {
    role: UserRole.PROVIDER,
    first_name: "James",
    business_id: businessId,
    last_name: "Wilson",
    phone_number: "+61412345678",
    email: "james@davidremovals.com",
  };
}

export function createManicuristProviderUserData(businessId: string): CreateUserData {
  return {
    role: UserRole.PROVIDER,
    first_name: "Emma",
    business_id: businessId,
    last_name: "Taylor",
    phone_number: "+61423456789",
    email: "emma@nailsonthego.com.au",
  };
}

export function createPlumberProviderUserData(businessId: string): CreateUserData {
  return {
    role: UserRole.PROVIDER,
    first_name: "Tom",
    business_id: businessId,
    last_name: "Brown",
    phone_number: "+61434567890",
    email: "tom@fixitplumbing.com.au",
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

// Function to create super admin user data
export function createSuperAdminUserData(businessId: string): CreateUserData {
  return {
    role: UserRole.SUPER_ADMIN,
    first_name: "Juan",
    business_id: businessId,
    last_name: "Bernal",
    phone_number: "+61411851098",
    email: "info@skedy.io",
  };
}

// Demo business owner user data functions
export function createTigaRemovalistOwnerUserData(businessId: string): CreateUserData {
  return {
    role: UserRole.ADMIN_PROVIDER,
    first_name: "Edward",
    business_id: businessId,
    last_name: "Tiga",
    phone_number: "+61468002102",
    email: "edward@tigapropertyservices.com",
  };
}

export function createRemovalistOwnerUserData(businessId: string): CreateUserData {
  return {
    role: UserRole.ADMIN_PROVIDER,
    first_name: "David",
    business_id: businessId,
    last_name: "Smith",
    phone_number: "+61468002102",
    email: "david@davidremovals.com",
  };
}

export function createManicuristOwnerUserData(businessId: string): CreateUserData {
  return {
    role: UserRole.ADMIN_PROVIDER,
    first_name: "Sarah",
    business_id: businessId,
    last_name: "Chen",
    phone_number: "+61498765432",
    email: "sarah@nailsonthego.com.au",
  };
}

export function createPlumberOwnerUserData(businessId: string): CreateUserData {
  return {
    role: UserRole.ADMIN_PROVIDER,
    first_name: "Mike",
    business_id: businessId,
    last_name: "Johnson",
    phone_number: "+61387654321",
    email: "mike@fixitplumbing.com.au",
  };
}

export function createMWAVOwnerUserData(businessId: string): CreateUserData {
  return {
    role: UserRole.ADMIN_PROVIDER,
    first_name: "Tim",
    business_id: businessId,
    last_name: "Bishop",
    phone_number: "+61394173443",
    email: "tim@manwithavan.com.au",
  };
}
