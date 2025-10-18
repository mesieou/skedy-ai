import type { Session } from '../../../sessions/session';
import { buildToolResponse } from '../../../services/helpers/responseBuilder';
import { sentry } from '@/features/shared/utils/sentryService';

/**
 * Collect date and time preference for move
 *
 * Stores in session only - doesn't check Skedy availability
 * MWAV will handle their own availability
 */
export async function collectDateTime(
  args: {
    preferred_date: string;           // YYYY-MM-DD
    time_preference: 'morning' | 'afternoon';
  },
  session: Session
): Promise<Record<string, unknown>> {
  const startTime = Date.now();

  try {
    sentry.addBreadcrumb(`Collecting date/time for MWAV`, 'mwav-datetime', {
      sessionId: session.id,
      businessId: session.businessId,
      date: args.preferred_date,
      timePreference: args.time_preference
    });

    // Initialize mwavEnquiry if needed
    if (!session.mwavEnquiry) {
      session.mwavEnquiry = {
        pickupLocations: [],
        dropoffLocations: [],
        items: []
      };
    }

    // Store date/time in mwavEnquiry
    session.mwavEnquiry.dateTime = {
      preferred_date: args.preferred_date,
      time_preference: args.time_preference
    };

    const duration = Date.now() - startTime;

    sentry.addBreadcrumb(`Date/time collected`, 'mwav-datetime', {
      sessionId: session.id,
      duration
    });

    return buildToolResponse(
      {
        preferred_date: args.preferred_date,
        time_preference: args.time_preference,
        display: `${args.preferred_date} - ${args.time_preference}`
      } as unknown as Record<string, unknown>,
      `Move scheduled for ${args.preferred_date} (${args.time_preference})`,
      true
    );

  } catch (error) {
    const duration = Date.now() - startTime;

    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'mwav_collect_date_time',
      metadata: { duration }
    });

    throw error;
  }
}
