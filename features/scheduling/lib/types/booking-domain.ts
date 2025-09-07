/**
 * Booking Domain Types
 *
 * Single source of truth for all booking-related types.
 * Eliminates duplication across booking-calculations.ts and database types.
 */

// Import and re-export existing types
import type {
  BookingCalculationInput,
  BookingCalculationResult,
  PriceBreakdown,
  ServiceBreakdown,
  TravelBreakdown,
  BusinessFeeBreakdown,
  BookingAddress,
  ServiceWithQuantity,
  RouteSegment
} from './booking-calculations';

import { AddressRole } from './booking-calculations';

// Re-export for external use
export type {
  BookingCalculationInput,
  BookingCalculationResult,
  PriceBreakdown,
  ServiceBreakdown,
  TravelBreakdown,
  BusinessFeeBreakdown,
  BookingAddress,
  ServiceWithQuantity,
  RouteSegment
};

export { AddressRole };

// Import database types
import type {
  Booking,
  BookingStatus,
  CreateBookingData,
  UpdateBookingData
} from '../../../shared/lib/database/types/bookings';

import type {
  BookingService
} from '../../../shared/lib/database/types/booking-services';

import type {
  Address,
  AddressType
} from '../../../shared/lib/database/types/addresses';

import type {
  Service,
  Business,
  User
} from '../../../shared/lib/database/types';

// Re-export database types
export type {
  Booking,
  BookingStatus,
  CreateBookingData,
  UpdateBookingData,
  BookingService,
  Address,
  AddressType,
  Service,
  Business,
  User
};

// ============================================================================
// CONSOLIDATED BOOKING DOMAIN INTERFACES
// ============================================================================

/**
 * Quote Request Data - Complete interface for quote generation
 */
export interface QuoteRequestData {
  service_name?: string;
  service_names?: string[];
  quantity?: number;
  job_scope?: string;
  pickup_address?: string;
  pickup_addresses?: string[];
  dropoff_address?: string;
  dropoff_addresses?: string[];
  service_address?: string;
  customer_addresses?: string[];
  preferred_datetime?: string;
  special_requirements?: string;
  number_of_people?: number;
  number_of_rooms?: number;
  square_meters?: number;
  number_of_vehicles?: number;
}

/**
 * Quote Result → Booking Input (Second stage)
 */
export interface BookingCreationInput {
  // Quote calculation result
  quote_result: BookingCalculationResult;

  // Booking-specific data
  preferred_date: string;
  preferred_time: string;
  user: User;
  business: Business;
}

/**
 * Complete Booking Data for Database (Final stage)
 */
export interface CompleteBookingData {
  // Core booking entity
  booking: CreateBookingData;

  // Related entities (extracted from quote PriceBreakdown)
  booking_services: BookingService[];
  addresses: Address[];
}

/**
 * Time slot availability check result
 */
export interface TimeSlotCheck {
  available: boolean;
  message: string;
}

/**
 * Booking creation result
 */
export interface BookingCreationResult {
  success: boolean;
  booking?: CompleteBookingData;
  error?: string;
}
