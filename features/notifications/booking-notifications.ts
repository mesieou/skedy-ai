import { sendText } from './sentText';
import type { Booking } from '../shared/lib/database/types/bookings';
import type { User } from '../shared/lib/database/types/user';
import type { Business } from '../shared/lib/database/types/business';
import type { Session } from '../agent/sessions/session';
import type { BookingAddress } from '../scheduling/lib/types/booking-calculations';
import { AddressRole } from '../scheduling/lib/types/booking-calculations';
import { DateUtils } from '../shared/utils/date-utils';
import assert from 'assert';

/**
 * Booking notification service - completely independent
 * Handles all SMS notifications related to bookings
 */
export class BookingNotifications {

  /**
   * Send booking confirmation SMS to customer
   */
  static async sendBookingConfirmation(
    booking: Booking,
    customer: User,
    business: Business,
    serviceName?: string
  ): Promise<void> {
    try {
      assert(customer.phone_number, 'Customer phone number is required for booking confirmation');

      // Convert UTC booking time to business timezone for customer
      const { date, time } = DateUtils.convertUTCToTimezone(booking.start_at, business.time_zone);
      const { time: endTime } = DateUtils.convertUTCToTimezone(booking.end_at, business.time_zone);

      // Format customer name (first name only for SMS brevity)
      const customerName = customer.first_name || customer.email?.split('@')[0] || 'Customer';

      const message = `🎉 Hi ${customerName}! Your booking is confirmed with ${business.name}

📋 Service: ${serviceName || 'Service booking'}
📅 Date: ${date}
⏰ Time: ${time} - ${endTime}
💰 Total Estimate: $${booking.total_estimate_amount.toFixed(2)}
💳 Deposit: $${booking.deposit_amount.toFixed(2)}

📞 Questions? Call ${business.phone_number}
📧 Email: ${business.email}

Booking Ref: ${booking.id.slice(-8).toUpperCase()}

⚠️ Note: This is an estimate and final costs may vary based on actual work required.`;

      await sendText(customer.phone_number, message, business.twilio_number!);
      console.log(`✅ Booking confirmation sent to ${customer.first_name || customer.email}`);

    } catch (error) {
      console.error(`❌ Failed to send booking confirmation:`, error);
      // Don't throw - notifications shouldn't break the booking flow
    }
  }

  /**
   * Send booking reminder SMS (24 hours before)
   */
  static async sendBookingReminder(
    booking: Booking,
    customer: User,
    business: Business
  ): Promise<void> {
    try {
      assert(customer.phone_number, 'Customer phone number is required for booking reminder');

      const { date, time } = DateUtils.convertUTCToTimezone(booking.start_at, business.time_zone);

      const message = `⏰ Reminder: Your ${business.name} booking is tomorrow!
📅 ${date} at ${time}
📍 We'll contact you 30min before arrival
Ref: ${booking.id.slice(-8)}`;

      await sendText(customer.phone_number, message, business.twilio_number!);
      console.log(`✅ Booking reminder sent to ${customer.email}`);

    } catch (error) {
      console.error(`❌ Failed to send booking reminder:`, error);
    }
  }

  /**
   * Send booking cancellation SMS
   */
  static async sendBookingCancellation(
    booking: Booking,
    customer: User,
    business: Business,
    reason?: string
  ): Promise<void> {
    try {
      assert(customer.phone_number, 'Customer phone number is required for booking cancellation');

      const { date, time } = DateUtils.convertUTCToTimezone(booking.start_at, business.time_zone);

      const message = `❌ Booking cancelled: ${business.name}
📅 ${date} at ${time}
${reason ? `Reason: ${reason}` : ''}
💰 Refund will be processed within 3-5 business days
📞 Questions? Call ${business.phone_number}`;

      await sendText(customer.phone_number, message, business.twilio_number!);
      console.log(`✅ Booking cancellation sent to ${customer.email}`);

    } catch (error) {
      console.error(`❌ Failed to send booking cancellation:`, error);
    }
  }

  /**
   * Send pre-booking confirmation SMS with all collected details
   * This is sent BEFORE creating the actual booking for customer verification
   */
  static async sendPreBookingConfirmation(
    session: Session,
    customer: User,
    business: Business,
    preferredDate: string,
    preferredTime: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      assert(customer.phone_number, 'Customer phone number is required for pre-booking confirmation');
      assert(session.selectedQuote, 'Selected quote is required for pre-booking confirmation');
      assert(session.selectedQuoteRequest, 'Selected quote request is required for pre-booking confirmation');

      const quote = session.selectedQuote;
      const quoteRequest = session.selectedQuoteRequest;

      // Format customer name
      const customerName = customer.first_name || customer.email?.split('@')[0] || 'Customer';
      const fullName = customer.last_name
        ? `${customer.first_name} ${customer.last_name}`
        : customer.first_name;

      // Format date and time for display
      const formattedDate = DateUtils.formatDateForDisplay(preferredDate);
      const formattedTime = DateUtils.formatTimeForDisplay(preferredTime);

      // Extract addresses from quote request addresses array
      const pickupAddresses = quoteRequest?.addresses?.filter((addr: BookingAddress) =>
        addr.role === AddressRole.PICKUP
      ) || [];
      const dropoffAddresses = quoteRequest?.addresses?.filter((addr: BookingAddress) =>
        addr.role === AddressRole.DROPOFF
      ) || [];

      // Format addresses for display
      const formatAddress = (addr: BookingAddress): string => {
        const parts = [
          addr.address.address_line_1,
          addr.address.address_line_2,
          addr.address.city,
          addr.address.state,
          addr.address.postcode
        ].filter(Boolean);
        return parts.join(', ');
      };

      const pickupText = pickupAddresses.length > 0
        ? pickupAddresses.map((addr: BookingAddress, i: number) => `${i + 1}. ${formatAddress(addr)}`).join('\n')
        : 'Not specified';

      const dropoffText = dropoffAddresses.length > 0
        ? dropoffAddresses.map((addr: BookingAddress, i: number) => `${i + 1}. ${formatAddress(addr)}`).join('\n')
        : 'Not specified';

      // Format time estimate
      const timeHours = Math.floor(quote.total_estimate_time_in_minutes / 60);
      const timeMinutes = quote.total_estimate_time_in_minutes % 60;
      const timeEstimate = timeHours > 0
        ? `${timeHours}h ${timeMinutes > 0 ? timeMinutes + 'm' : ''}`.trim()
        : `${timeMinutes}m`;

      // Get service name from the first service in the quote request
      const serviceName = quoteRequest?.services?.[0]?.service?.name || 'Removalist Service';

      // Build comprehensive confirmation message
      const message = `📋 BOOKING CONFIRMATION REQUIRED

Hi ${customerName}! Please confirm all details are correct:

👤 CUSTOMER DETAILS:
Name: ${fullName}
Phone: ${customer.phone_number}
${customer.email ? `Email: ${customer.email}` : ''}

🚚 SERVICE DETAILS:
Service: ${serviceName}
Total Estimate: $${quote.total_estimate_amount.toFixed(2)}
Deposit Required: $${quote.deposit_amount.toFixed(2)}
Estimate Time: ${timeEstimate}

📍 PICKUP LOCATIONS:
${pickupText}

📍 DROP-OFF LOCATIONS:
${dropoffText}

📅 PREFERRED DATE & TIME:
${formattedDate} at ${formattedTime}

⚠️ This is an estimate - final costs may vary based on actual work required.

📞 Reply "YES" to confirm or call ${business.phone_number} to make changes.

- ${business.name}`;

      const result = await sendText(customer.phone_number, message, business.twilio_number!);

      if (result.success) {
        console.log(`✅ Pre-booking confirmation sent to ${customer.first_name || customer.email}`);
      }

      return result;

    } catch (error) {
      console.error(`❌ Failed to send pre-booking confirmation:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
