import type { Session } from '../../../sessions/session';
import { buildToolResponse } from '../../../services/helpers/responseBuilder';
import { sentry } from '@/features/shared/utils/sentryService';
import { sendText } from '@/features/notifications/sentText';

/**
 * Send enquiry confirmation to customer via SMS/Email
 *
 * Sends complete summary of collected data to customer for review
 * before submitting to MWAV. Returns confirmation ID that's required
 * by send_mwav_enquiry tool.
 */
export async function sendEnquiryConfirmation(
  args: {
    send_via: 'sms' | 'email' | 'both';
  },
  session: Session
): Promise<Record<string, unknown>> {
  const startTime = Date.now();

  try {
    sentry.addBreadcrumb(`Sending enquiry confirmation`, 'mwav-confirmation', {
      sessionId: session.id,
      businessId: session.businessId,
      sendVia: args.send_via
    });

    // Validate required data
    if (!session.mwavEnquiry) {
      return buildToolResponse(
        null,
        'No MWAV enquiry data to confirm. Please collect location and item details first.',
        false
      );
    }

    if (!session.mwavEnquiry.customerDetails) {
      return buildToolResponse(
        null,
        'Customer details not collected. Cannot send confirmation.',
        false
      );
    }

    // Build comprehensive confirmation message with ALL details
    const pickupSummary = session.mwavEnquiry.pickupLocations
      .map((loc, idx) => {
        const parking = loc.parking_distance.replace(/_/g, ' ');
        const stairs = loc.stairs_count === 'none' ? 'no stairs' : `${loc.stairs_count} flights of stairs`;
        const lift = loc.has_lift ? 'lift available' : 'no lift';
        return `Pickup ${idx + 1}: ${loc.address}\n  - Parking: ${parking}\n  - ${stairs}, ${lift}`;
      })
      .join('\n\n');

    const dropoffSummary = session.mwavEnquiry.dropoffLocations
      .map((loc, idx) => {
        const parking = loc.parking_distance.replace(/_/g, ' ');
        const stairs = loc.stairs_count === 'none' ? 'no stairs' : `${loc.stairs_count} flights of stairs`;
        const lift = loc.has_lift ? 'lift available' : 'no lift';
        return `Dropoff ${idx + 1}: ${loc.address}\n  - Parking: ${parking}\n  - ${stairs}, ${lift}`;
      })
      .join('\n\n');

    const itemsSummary = session.mwavEnquiry.items
      .map(item => `  ${item.quantity}x ${item.item_name}`)
      .join('\n');

    const customerDetails = session.mwavEnquiry.customerDetails;
    const dateTime = session.mwavEnquiry.dateTime;

    const dateTimeSummary = dateTime
      ? `\n\nPREFERRED DATE/TIME:\nDate: ${dateTime.preferred_date}\nTime: ${dateTime.time_preference}`
      : '';

    const confirmationMessage = `
Man With A Van - Details Confirmation

CUSTOMER DETAILS:
Name: ${customerDetails.first_name} ${customerDetails.last_name}
Phone: ${customerDetails.phone}
Email: ${customerDetails.email}

PICKUP LOCATIONS:
${pickupSummary}

DROPOFF LOCATIONS:
${dropoffSummary}

ITEMS TO MOVE:
${itemsSummary}${dateTimeSummary}

Please reply YES to confirm all these details are correct. We'll then get you a quote.
    `.trim();

    // Send confirmation
    if (args.send_via === 'sms' || args.send_via === 'both') {
      if (!customerDetails.phone) {
        return buildToolResponse(
          null,
          'Customer phone number not available. Cannot send SMS.',
          false
        );
      }

      await sendText(
        customerDetails.phone,
        confirmationMessage,
        session.businessEntity.twilio_number!
      );
    }

    // TODO: Add email sending logic when send_via is 'email' or 'both'
    if (args.send_via === 'email' || args.send_via === 'both') {
      console.log('📧 [MWAV] Email confirmation would be sent to:', customerDetails.email);
      // Future: Implement email sending
    }

    const confirmationId = `CONF-${Date.now()}`;

    // Store confirmation ID in session (required for send_mwav_enquiry)
    session.mwavEnquiry.confirmationId = confirmationId;

    const duration = Date.now() - startTime;

    sentry.addBreadcrumb(`Enquiry confirmation sent`, 'mwav-confirmation', {
      sessionId: session.id,
      duration,
      sendVia: args.send_via,
      confirmationId
    });

    return buildToolResponse(
      {
        confirmation_sent: true,
        confirmation_id: confirmationId,
        sent_via: args.send_via,
        customer_phone: customerDetails.phone,
        customer_email: customerDetails.email
      } as unknown as Record<string, unknown>,
      `Confirmation sent via ${args.send_via}. Waiting for customer to reply YES.`,
      true
    );

  } catch (error) {
    const duration = Date.now() - startTime;

    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'mwav_send_enquiry_confirmation',
      metadata: {
        duration,
        sendVia: args.send_via
      }
    });

    throw error;
  }
}
