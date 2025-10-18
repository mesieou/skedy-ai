import type { Session } from '../../../sessions/session';
import { buildToolResponse } from '../../../services/helpers/responseBuilder';
import { sentry } from '@/features/shared/utils/sentryService';
import type { LocationDetailsResult } from '../mwav-types';
import { AddressValidator } from '@/features/scheduling/lib/bookings/address-validator';

/**
 * Collect location details (pickup or dropoff) with access information
 *
 * This tool stores location data in session.mwavEnquiry with proper indexing
 * for linking items to specific pickup/dropoff locations
 */
export async function collectLocationDetails(
  args: {
    location_type: 'pickup' | 'dropoff';
    address: string;
    parking_distance: string;  // Enum value
    stairs_count: string;       // Enum value
    has_lift: boolean;
  },
  session: Session
): Promise<Record<string, unknown>> {
  const startTime = Date.now();

  try {
    sentry.addBreadcrumb(`Collecting ${args.location_type} location details`, 'mwav-location', {
      sessionId: session.id,
      businessId: session.businessId,
      locationType: args.location_type,
      address: args.address
    });

    // Validate address format
    const addressValidator = new AddressValidator();
    const validationArgs = args.location_type === 'pickup'
      ? { pickup_addresses: [args.address] }
      : { dropoff_addresses: [args.address] };

    const addressValidation = await addressValidator.validateQuoteAddresses(
      validationArgs,
      args.location_type === 'pickup' ? ['pickup_addresses'] : ['dropoff_addresses']
    );

    if (!addressValidation.isValid) {
      return buildToolResponse(
        null,
        `Invalid address: ${addressValidation.message}. Please provide full address with street number, street name, and suburb.`,
        false
      );
    }

    // Initialize mwavEnquiry if it doesn't exist
    if (!session.mwavEnquiry) {
      session.mwavEnquiry = {
        pickupLocations: [],
        dropoffLocations: [],
        items: []
      };
    }

    // Determine the next index for this location type
    const isPickup = args.location_type === 'pickup';
    const locations = isPickup ? session.mwavEnquiry.pickupLocations : session.mwavEnquiry.dropoffLocations;
    const nextIndex = locations.length;

    // Create location object
    const location = {
      index: nextIndex,
      address: args.address,
      parking_distance: args.parking_distance,
      stairs_count: args.stairs_count,
      has_lift: args.has_lift
    };

    // Add to appropriate array
    if (isPickup) {
      session.mwavEnquiry.pickupLocations.push(location);
    } else {
      session.mwavEnquiry.dropoffLocations.push(location);
    }

    const duration = Date.now() - startTime;

    sentry.addBreadcrumb(`Location details collected successfully`, 'mwav-location', {
      sessionId: session.id,
      locationType: args.location_type,
      locationIndex: nextIndex,
      duration,
      totalPickups: session.mwavEnquiry.pickupLocations.length,
      totalDropoffs: session.mwavEnquiry.dropoffLocations.length
    });

    const result: LocationDetailsResult = {
      location_type: args.location_type,
      index: nextIndex,
      address: args.address,
      total_pickups: session.mwavEnquiry.pickupLocations.length,
      total_dropoffs: session.mwavEnquiry.dropoffLocations.length
    };

    return buildToolResponse(
      result as unknown as Record<string, unknown>,
      `${args.location_type === 'pickup' ? 'Pickup' : 'Dropoff'} location #${nextIndex + 1} added: ${args.address}`,
      true
    );

  } catch (error) {
    const duration = Date.now() - startTime;

    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'mwav_collect_location_details',
      metadata: {
        duration,
        locationType: args.location_type,
        address: args.address
      }
    });

    throw error;
  }
}
