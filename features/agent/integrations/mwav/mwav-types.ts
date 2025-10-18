/**
 * Man With A Van Integration - Type Definitions
 *
 * Clean, typed interfaces for MWAV integration
 * Note: These types are structured to be easily extractable into generic workflow types later
 */

// ============================================================================
// CATALOG TYPES (Future: Generic ItemCatalog)
// ============================================================================

export interface MWAVCatalog {
  categories: MWAVCategory[];
  metadata: {
    version: string;
    last_updated: string;
    total_items: number;
  };
}

export interface MWAVCategory {
  name: string;
  items: string[];  // Item names
}

// ============================================================================
// LOCATION TYPES (Future: Generic LocationDetails)
// ============================================================================

/**
 * Parking distance options (from MWAV website)
 */
export enum ParkingDistance {
  AT_THE_DOOR = 'at_the_door',                    // < 10m
  ON_THE_STREET = 'on_the_street',                // 10-25m
  DOWN_THE_STREET = 'down_the_street',            // 25-50m
  A_BIT_OF_A_WALK = 'a_bit_of_a_walk',           // 50-100m
  A_BIT_OF_A_HIKE = 'a_bit_of_a_hike',           // 100m+
  ITS_COMPLICATED = 'its_complicated'             // Special cases
}

/**
 * Stairs count options (from MWAV website)
 */
export enum StairsCount {
  NONE = 'none',
  ONE = '1',
  TWO = '2',
  THREE = '3',
  FOUR = '4',
  FIVE_PLUS = '5+'
}

export interface MWAVLocation {
  index: number;                    // For linking items to locations
  location_type: 'pickup' | 'dropoff';
  address: string;
  access_details: MWAVAccessDetails;
}

export interface MWAVAccessDetails {
  parking_distance: ParkingDistance;  // Enum from MWAV options
  stairs_count: StairsCount;          // Enum from MWAV options
  has_lift: boolean;                  // Do you have a lift?
}

// ============================================================================
// ITEM TYPES (Future: Generic ItemCollection)
// ============================================================================

export interface MWAVItem {
  item_name: string;                // Exact name from catalog
  quantity: number;
  category?: string;                // For display/grouping
  pickup_index: number;             // Which pickup location (links to MWAVLocation.index)
  dropoff_index: number;            // Which dropoff location (links to MWAVLocation.index)
  notes?: string;                   // Optional special instructions
}

// ============================================================================
// BOOKING/ENQUIRY STRUCTURE (Future: Generic BookingRequest)
// ============================================================================

export interface MWAVBookingData {
  // Locations
  pickupLocations: MWAVLocation[];
  dropoffLocations: MWAVLocation[];

  // Items
  items: MWAVItem[];

  // Timing (stored separately in session, used by existing tools)
  // Customer (stored in session.customerEntity)
}

// ============================================================================
// ENQUIRY SUBMISSION (Future: Generic SubmissionRequest)
// ============================================================================

export interface MWAVEnquiryRequest {
  // Locations
  pickup_addresses: Array<{
    address: string;
    parking_distance: ParkingDistance;
    stairs_count: StairsCount;
    has_lift: boolean;
  }>;
  dropoff_addresses: Array<{
    address: string;
    parking_distance: ParkingDistance;
    stairs_count: StairsCount;
    has_lift: boolean;
  }>;

  // Items with location linking
  items: Array<{
    item_name: string;
    quantity: number;
    pickup_index: number;
    dropoff_index: number;
  }>;

  // Timing
  preferred_date: string;           // YYYY-MM-DD
  time_preference: 'morning' | 'afternoon';

  // Customer
  contact: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
  };

  // Additional
  special_requirements?: string;

  // Quote (if already calculated)
  quote?: {
    total_estimate_amount: number;
    currency: string;
  };
}

export interface MWAVEnquiryResponse {
  success: boolean;
  enquiry_id?: string;
  message: string;
  errors?: string[];
}

// ============================================================================
// TOOL RESPONSE TYPES
// ============================================================================

export interface SearchItemsResult {
  exact_matches: Array<{
    item_name: string;
    category: string;
  }>;
  ambiguous_items: Array<{
    search_term: string;
    possible_matches: string[];
  }>;
  not_found: string[];
}

export interface AddItemsResult {
  items_added: MWAVItem[];
  total_items: number;
  message: string;
}

export interface LocationDetailsResult {
  location_type: 'pickup' | 'dropoff';
  index: number;
  address: string;
  total_pickups: number;
  total_dropoffs: number;
}
