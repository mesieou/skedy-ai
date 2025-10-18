import type { Session } from '../../../sessions/session';
import { buildToolResponse } from '../../../services/helpers/responseBuilder';
import { sentry } from '@/features/shared/utils/sentryService';
import type { MWAVEnquiryRequest, MWAVEnquiryResponse } from '../mwav-types';
import { ParkingDistance, StairsCount } from '../mwav-types';

/**
 * Send enquiry to MWAV API
 *
 * Collects all session data and submits to MWAV for quote/booking
 * Phase 1: Mock response (no actual API call)
 * Phase 2: Real API integration
 */
export async function sendMWAVEnquiry(
  args: {
    customer_confirmation: string;  // Required: Customer's YES confirmation
    confirmation_message?: string;
  },
  session: Session
): Promise<Record<string, unknown>> {
  const startTime = Date.now();

  try {
    sentry.addBreadcrumb(`Sending MWAV enquiry`, 'mwav-enquiry', {
      sessionId: session.id,
      businessId: session.businessId
    });

    // Validate required data
    if (!session.mwavEnquiry) {
      return buildToolResponse(
        null,
        'No MWAV enquiry data found. Please collect location and item details first.',
        false
      );
    }

    if (session.mwavEnquiry.pickupLocations.length === 0) {
      return buildToolResponse(
        null,
        'No pickup locations specified.',
        false
      );
    }

    if (session.mwavEnquiry.dropoffLocations.length === 0) {
      return buildToolResponse(
        null,
        'No dropoff locations specified.',
        false
      );
    }

    if (session.mwavEnquiry.items.length === 0) {
      return buildToolResponse(
        null,
        'No items added to the move.',
        false
      );
    }

    if (!session.mwavEnquiry.confirmationId) {
      return buildToolResponse(
        null,
        'Customer has not confirmed details yet. Please call send_enquiry_confirmation first.',
        false
      );
    }

    if (!session.mwavEnquiry.customerDetails) {
      return buildToolResponse(
        null,
        'Customer details not collected. Please call collect_customer_details first.',
        false
      );
    }

    if (!session.mwavEnquiry.dateTime) {
      return buildToolResponse(
        null,
        'Date/time not collected. Please call collect_date_time first.',
        false
      );
    }

    if (!session.mwavEnquiry.mwavQuote) {
      return buildToolResponse(
        null,
        'No quote from MWAV. Please call get_mwav_quote first.',
        false
      );
    }

    // Build enquiry request
    const enquiryRequest: MWAVEnquiryRequest = {
      pickup_addresses: session.mwavEnquiry.pickupLocations.map(loc => ({
        address: loc.address,
        parking_distance: loc.parking_distance as ParkingDistance,
        stairs_count: loc.stairs_count as StairsCount,
        has_lift: loc.has_lift
      })),
      dropoff_addresses: session.mwavEnquiry.dropoffLocations.map(loc => ({
        address: loc.address,
        parking_distance: loc.parking_distance as ParkingDistance,
        stairs_count: loc.stairs_count as StairsCount,
        has_lift: loc.has_lift
      })),
      items: session.mwavEnquiry.items.map(item => ({
        item_name: item.item_name,
        quantity: item.quantity,
        pickup_index: item.pickup_index,
        dropoff_index: item.dropoff_index
      })),
      preferred_date: session.mwavEnquiry.dateTime.preferred_date,
      time_preference: session.mwavEnquiry.dateTime.time_preference,
      contact: session.mwavEnquiry.customerDetails,
      special_requirements: args.confirmation_message,
      quote: {
        total_estimate_amount: session.mwavEnquiry.mwavQuote.estimate,
        currency: session.mwavEnquiry.mwavQuote.currency
      }
    };

    // PHASE 1: Mock API response
    // PHASE 2: Replace with actual API call
    // const response = await fetch('https://mwav.com/api/enquiries', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(enquiryRequest)
    // });

    const mockResponse: MWAVEnquiryResponse = {
      success: true,
      enquiry_id: `MWAV-${Date.now()}`,
      message: 'Enquiry submitted successfully to Man With A Van'
    };

    const duration = Date.now() - startTime;

    sentry.addBreadcrumb(`MWAV enquiry sent successfully`, 'mwav-enquiry', {
      sessionId: session.id,
      duration,
      enquiryId: mockResponse.enquiry_id,
      itemCount: session.mwavEnquiry.items.length,
      pickupCount: session.mwavEnquiry.pickupLocations.length,
      dropoffCount: session.mwavEnquiry.dropoffLocations.length
    });

    // Log the enquiry request for debugging
    console.log('📤 [MWAV Enquiry] Request:', JSON.stringify(enquiryRequest, null, 2));
    console.log('📥 [MWAV Enquiry] Response:', JSON.stringify(mockResponse, null, 2));

    return buildToolResponse(
      mockResponse as unknown as Record<string, unknown>,
      `Enquiry submitted! Reference: ${mockResponse.enquiry_id}. MWAV will contact you soon.`,
      true
    );

  } catch (error) {
    const duration = Date.now() - startTime;

    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'mwav_send_enquiry',
      metadata: {
        duration
      }
    });

    throw error;
  }
}
