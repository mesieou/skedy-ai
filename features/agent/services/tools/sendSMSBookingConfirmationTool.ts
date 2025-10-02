import { BookingNotifications } from '../../../notifications/booking-notifications';
import type { Session } from '../../sessions/session';
import { buildToolResponse } from '../helpers/responseBuilder';
import { sentry } from '@/features/shared/utils/sentryService';

/**
 * Send SMS booking confirmation tool - sends pre-booking confirmation with all collected data
 * This tool is used BEFORE creating the actual booking to confirm all details with the customer
 */
export async function sendSMSBookingConfirmationTool(
  args: {
    preferred_date: string;
    preferred_time: string;
    confirmation_message?: string;
  },
  session: Session
) {
  const startTime = Date.now();

  try {
    // Add breadcrumb for SMS confirmation start
    sentry.addBreadcrumb(`Sending pre-booking SMS confirmation`, 'tool-sms-confirmation', {
      sessionId: session.id,
      businessId: session.businessId,
      preferredDate: args.preferred_date,
      preferredTime: args.preferred_time,
      hasCustomer: !!session.customerEntity,
      hasQuote: !!session.selectedQuote
    });

    // Validate required session data
    if (!session.customerEntity) {
      return buildToolResponse(
        null,
        `Customer information is required. Please create the customer profile first using create_user.`,
        false
      );
    }

    if (!session.selectedQuote) {
      return buildToolResponse(
        null,
        `Quote information is required. Please generate a quote first using get_quote.`,
        false
      );
    }

    if (!session.businessEntity) {
      return buildToolResponse(
        null,
        `Business information is not available.`,
        false
      );
    }

    // Validate required arguments
    if (!args.preferred_date || args.preferred_date.trim().length === 0) {
      return buildToolResponse(
        null,
        `Preferred date is required to send booking confirmation.`,
        false
      );
    }

    if (!args.preferred_time || args.preferred_time.trim().length === 0) {
      return buildToolResponse(
        null,
        `Preferred time is required to send booking confirmation.`,
        false
      );
    }

    // Send pre-booking confirmation SMS
    const smsResult = await BookingNotifications.sendPreBookingConfirmation(
      session,
      session.customerEntity,
      session.businessEntity,
      args.preferred_date.trim(),
      args.preferred_time.trim()
    );

    const duration = Date.now() - startTime;

    if (smsResult.success) {
      // Success breadcrumb
      sentry.addBreadcrumb(`Pre-booking SMS confirmation sent successfully`, 'tool-sms-confirmation', {
        sessionId: session.id,
        businessId: session.businessId,
        customerId: session.customerEntity.id,
        duration: duration
      });

      const responseData = {
        sms_sent: true,
        customer_phone: session.customerEntity.phone_number,
        message_type: 'pre_booking_confirmation'
      };

      return buildToolResponse(
        responseData,
        `Booking confirmation SMS sent to ${session.customerEntity.first_name} at ${session.customerEntity.phone_number}. ${args.confirmation_message || 'Please wait for their confirmation before proceeding with the booking.'}`,
        true
      );
    } else {
      // SMS sending failed
      sentry.trackError(new Error(`SMS sending failed: ${smsResult.error}`), {
        sessionId: session.id,
        businessId: session.businessId,
        operation: 'tool_sms_confirmation_failed',
        metadata: {
          duration: duration,
          customerId: session.customerEntity.id,
          customerPhone: session.customerEntity.phone_number,
          error: smsResult.error
        }
      });

      return buildToolResponse(
        { sms_sent: false, error: smsResult.error },
        `Failed to send booking confirmation SMS: ${smsResult.error}. You confirm the details are correct over the phone.`,
        false
      );
    }

  } catch (error) {
    const duration = Date.now() - startTime;

    // Track SMS confirmation error
    sentry.trackError(error as Error, {
      sessionId: session.id,
      businessId: session.businessId,
      operation: 'tool_sms_confirmation_error',
      metadata: {
        duration: duration,
        preferredDate: args.preferred_date,
        preferredTime: args.preferred_time,
        hasCustomer: !!session.customerEntity,
        hasQuote: !!session.selectedQuote,
        errorName: (error as Error).name
      }
    });

    // Internal system errors should still throw
    throw error;
  }
}
