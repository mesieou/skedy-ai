import type { Session } from '../../../sessions/session';
import { buildToolResponse } from '../../../services/helpers/responseBuilder';
import { sentry } from '@/features/shared/utils/sentryService';
import type { MWAVEnquiryRequest } from '../mwav-types';
import { ParkingDistance, StairsCount } from '../mwav-types';

/**
 * Get quote from MWAV API
 *
 * Sends all collected data to MWAV to get their price estimate
 * Phase 1: Mock response
 * Phase 2: Real API call to MWAV /quote endpoint
 */
export async function getMWAVQuote(
  args: {
    confirm_locations_collected: string;
    confirm_items_collected: string;
    confirm_customer_details: string;
    confirm_date_time: string;
  },
  session: Session
): Promise<Record<string, unknown>> {
  const startTime = Date.now();

  try {
    sentry.addBreadcrumb(`Getting quote from MWAV`, 'mwav-get-quote', {
      sessionId: session.id,
      businessId: session.businessId
    });

    // Validate required data
    if (!session.mwavEnquiry) {
      return buildToolResponse(null, 'No enquiry data collected yet.', false);
    }

    if (session.mwavEnquiry.pickupLocations.length === 0) {
      return buildToolResponse(null, 'No pickup locations specified.', false);
    }

    if (session.mwavEnquiry.dropoffLocations.length === 0) {
      return buildToolResponse(null, 'No dropoff locations specified.', false);
    }

    if (session.mwavEnquiry.items.length === 0) {
      return buildToolResponse(null, 'No items added.', false);
    }

    if (!session.mwavEnquiry.customerDetails) {
      return buildToolResponse(null, 'Customer details not collected.', false);
    }

    if (!session.mwavEnquiry.dateTime) {
      return buildToolResponse(null, 'Date/time not collected.', false);
    }

    // Build quote request for MWAV
    const quoteRequest: MWAVEnquiryRequest = {
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
      special_requirements: undefined,
      quote: undefined // Not available yet
    };

    // PHASE 1: Mock MWAV quote response (matching their actual format)
    // PHASE 2: Replace with real API call
    // const response = await fetch('https://mwav.com/api/quote', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(quoteRequest)
    // });
    // const mwavQuote = await response.json();

    const mockQuote = {
      quote_id: `MWAV-QUOTE-${Date.now()}`,
      duration: {
        hours: 2,
        minutes: 28,
        display: '2 hrs 28 mins'
      },
      estimate: 582.13,
      currency: 'AUD',
      truck: '1x M Truck',
      movers: '2x Movers',
      accuracy_note: 'With accurate information from you 95% of our moves are completed within 30 minutes of the estimated time.'
    };

    // Store MWAV quote in session
    session.mwavEnquiry.mwavQuote = mockQuote;

    const duration = Date.now() - startTime;

    sentry.addBreadcrumb(`MWAV quote received`, 'mwav-get-quote', {
      sessionId: session.id,
      duration,
      quoteId: mockQuote.quote_id,
      totalAmount: mockQuote.estimate
    });

    console.log('📤 [MWAV Quote] Request:', JSON.stringify(quoteRequest, null, 2));
    console.log('📥 [MWAV Quote] Response:', JSON.stringify(mockQuote, null, 2));

    return buildToolResponse(
      mockQuote as unknown as Record<string, unknown>,
      `Duration: ${mockQuote.duration.display}. Estimate: $${mockQuote.estimate} ${mockQuote.currency}. ${mockQuote.accuracy_note}`,
      true
    );

  } catch (error) {
    const duration = Date.now() - startTime;

    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'mwav_get_quote',
      metadata: { duration }
    });

    throw error;
  }
}
