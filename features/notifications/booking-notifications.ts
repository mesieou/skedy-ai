import { sendText } from './sentText';
import type { Booking } from '../shared/lib/database/types/bookings';
import type { User } from '../shared/lib/database/types/user';
import type { Business } from '../shared/lib/database/types/business';
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

      await sendText(customer.phone_number, message);
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

      await sendText(customer.phone_number, message);
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

      await sendText(customer.phone_number, message);
      console.log(`✅ Booking cancellation sent to ${customer.email}`);

    } catch (error) {
      console.error(`❌ Failed to send booking cancellation:`, error);
    }
  }
}
