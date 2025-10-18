import type { Session } from '../../../sessions/session';
import { buildToolResponse } from '../../../services/helpers/responseBuilder';
import { sentry } from '@/features/shared/utils/sentryService';

/**
 * Collect customer details for MWAV enquiry
 *
 * Stores customer info in session only (NOT in Skedy database)
 * This is just for passing to MWAV API
 */
export async function collectCustomerDetails(
  args: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
  },
  session: Session
): Promise<Record<string, unknown>> {
  const startTime = Date.now();

  try {
    sentry.addBreadcrumb(`Collecting customer details for MWAV`, 'mwav-customer', {
      sessionId: session.id,
      businessId: session.businessId
    });

    // Initialize mwavEnquiry if needed
    if (!session.mwavEnquiry) {
      session.mwavEnquiry = {
        pickupLocations: [],
        dropoffLocations: [],
        items: []
      };
    }

    // Store customer details in mwavEnquiry (not creating Skedy user)
    session.mwavEnquiry.customerDetails = {
      first_name: args.first_name,
      last_name: args.last_name,
      phone: args.phone,
      email: args.email
    };

    const duration = Date.now() - startTime;

    sentry.addBreadcrumb(`Customer details collected`, 'mwav-customer', {
      sessionId: session.id,
      duration
    });

    return buildToolResponse(
      {
        customer_name: `${args.first_name} ${args.last_name}`,
        phone: args.phone,
        email: args.email
      } as unknown as Record<string, unknown>,
      `Customer details saved: ${args.first_name} ${args.last_name}`,
      true
    );

  } catch (error) {
    const duration = Date.now() - startTime;

    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'mwav_collect_customer_details',
      metadata: { duration }
    });

    throw error;
  }
}
