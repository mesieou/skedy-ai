import { BaseEntity } from "./base";

/**
 * Address type classification
 * Used for both database storage and booking calculations
 */
export enum AddressType {
  CUSTOMER = 'customer',  // Customer/service address for mobile services
  BUSINESS = 'business',  // Business base location
  PICKUP = 'pickup',      // Pickup location (e.g., removalist origin)
  DROPOFF = 'dropoff'     // Dropoff location (e.g., removalist destination)
}

export interface Address extends BaseEntity {
  service_id: string;
  type: AddressType;
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  postcode: string;
  state?: string | null;
  country: string;
}

export type CreateAddressData = Omit<Address, 'id' | 'created_at' | 'updated_at'>;
export type UpdateAddressData = Partial<Omit<Address, 'id' | 'created_at'>>;

/**
 * Booking address with context (before database creation)
 * Used for quote calculations and booking creation
 */
export interface BookingAddress {
  id: string; // Unique identifier for this address in booking context
  address: Address; // The actual address data
  type: AddressType; // Type of address: PICKUP, DROPOFF, CUSTOMER, or BUSINESS
  sequence_order: number; // Order in route (important for travel calculations)
  service_id?: string; // Optional: which service this address is for
  special_instructions?: string; // Optional: additional instructions
}

/**
 * Simple address input (from forms, Google Places, etc.)
 * Can be converted to CreateAddressData (by adding service_id and type)
 */
export interface AddressInput {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  formatted_address?: string; // Optional: for display
}

/**
 * Google Places parsed result
 * Extends AddressInput with additional metadata
 */
export interface ParsedGoogleAddress extends AddressInput {
  place_id?: string;
  geometry?: {
    lat: number;
    lng: number;
  };
}
