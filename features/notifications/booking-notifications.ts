import { sendText } from './sentText';
import type { Booking } from '../shared/lib/database/types/bookings';
import type { User } from '../shared/lib/database/types/user';
import type { Session } from '../agent/sessions/session';
import type { BookingAddress } from '../scheduling/lib/types/booking-calculations';
import { AddressType } from '../scheduling/lib/types/booking-calculations';
import { DateUtils } from '../shared/utils/date-utils';
import { buildQuoteToolResponse } from '../agent/services/helpers/responseBuilder';

/**
 * Booking notification service - handles all SMS notifications
 */

// SMS Templates - Single unified system
const SMS_TEMPLATES = {
  // Default quote details template
  QUOTE_DETAILS_DEFAULT: `👤 CUSTOMER DETAILS:
Name: {fullName}
Phone: {customerPhone}
Email: {customerEmail}

Service: {serviceName}
Number of Removalists: {numberOfRemovalists}

📍 Locations:
Pickup Locations:
{pickupText}
Drop-off Locations:
{dropoffText}

📅 Preferred Date & Time:
{formattedDate} at {formattedTime}

Total Estimate Time: {timeEstimate}
Total Quote Estimate: {totalAmount}
⚠️ This is an estimate - final costs may vary based on actual work required.

📋 Payment Details:
Deposit Required: {depositAmount}
Deposit Paid: {depositPaid}
Remaining Balance: {remainingBalance}

Preferred Payment Method at service: {paymentMethod}

If you have any questions, please text us at {businessPhone}.

Skedy
- {businessName}`,

  // Tiga-specific quote details template
  QUOTE_DETAILS_TIGA: `👤 CUSTOMER DETAILS:
Name: {fullName}
Phone: {customerPhone}
Email: {customerEmail}

Service: {serviceName}
Number of Removalists: {numberOfRemovalists}

📍 Locations:
Pickup Locations:
{pickupText}
Drop-off Locations:
{dropoffText}

📅 Preferred Date & Time:
{formattedDate} at {formattedTime}

💰 QUOTE BREAKDOWN:
Work estimate: {workEstimate} ({workEstimateTime}h)
Back to base: {backToBaseCost} ({backToBaseTime}h)
GST {gstStatus}
⚠️ THIS IS ONLY AN ESTIMATE, THE FINAL COST MAY VARY.

📋 Payment Details:
Deposit Required: {depositAmount}
Deposit Paid: {depositPaid}

Preferred Payment Method at service: {paymentMethod}

If you have any questions, please text us at {businessPhone}.

Skedy
- {businessName}`,

  PAYMENT_REQUIRED: `💳 PAYMENT REQUIRED
Hi {customerName} 😊!

Please complete your deposit payment to secure your booking with {businessName}.
💰 Deposit Required: {depositAmount}
🔗 Payment Link: {paymentLink}

⚠️ Your booking is not confirmed until payment is completed.

📋 Quote Details:
{quoteDetails}`,

  BOOKING_CONFIRMATION: `🎉 Hi {customerName} 😊! Your booking is confirmed with {businessName}

📋 Booking Details:
{quoteDetails}`,

  PRE_BOOKING_CONFIRMATION: `Hi {customerName} 😊!

Can you please confirm all details are correct?

📋 Booking Details:
{quoteDetails}`
};

// Helper functions
const formatCustomerName = (user: User): string => {
  return user.first_name || user.email?.split('@')[0] || 'Customer';
};

const formatFullName = (user: User): string => {
  return user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name || 'Customer';
};

const formatCurrency = (amount: number): string => `$${amount.toFixed(2)}`;

const formatBookingRef = (bookingId: string): string => bookingId.slice(-8).toUpperCase();

const formatTimeEstimate = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 ? `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`.trim() : `${remainingMinutes}m`;
};

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

const formatAddressesByType = (addresses: BookingAddress[], type: AddressType): string => {
  const filtered = addresses.filter(addr => addr.type === type);
  if (filtered.length === 0) return 'Not specified';

  return filtered
    .map((addr, index) => `${index + 1}. ${formatAddress(addr)}`)
    .join('\n');
};

/**
 * Extract common notification data from session - eliminates duplication
 */
const extractNotificationData = (session: Session, preferredDate?: string, preferredTime?: string, booking?: Booking) => {
  const customer = session.customerEntity!;
  const business = session.businessEntity!;
  const quoteRequest = session.selectedQuote!.request;
  const quoteResult = session.selectedQuote!.result;

  // Use booking dates if available, otherwise use preferred dates
  let finalDate = preferredDate;
  let finalTime = preferredTime;

  if (booking) {
    const { date, time } = DateUtils.convertUTCToTimezone(booking.start_at, business.time_zone);
    finalDate = date;
    finalTime = time;
  }

  // DEBUG: Log addresses being used for notification
  console.log(`📍 [Notification] QuoteRequest addresses count: ${quoteRequest.addresses?.length || 0}`);
  console.log(`📍 [Notification] QuoteRequest addresses:`, JSON.stringify(quoteRequest.addresses, null, 2));

  // Base data for all businesses
  const baseData = {
    customerName: formatCustomerName(customer),
    fullName: formatFullName(customer),
    customerPhone: customer.phone_number || 'Not provided',
    customerEmail: customer.email || 'Not provided',
    businessName: business.name,
    businessPhone: business.phone_number,
    serviceName: quoteRequest.services[0]?.service?.name || 'Service',
    numberOfRemovalists: quoteRequest.number_of_people?.toString() || '1',
    pickupText: formatAddressesByType(quoteRequest.addresses || [], AddressType.PICKUP),
    dropoffText: formatAddressesByType(quoteRequest.addresses || [], AddressType.DROPOFF),
    formattedDate: finalDate ? DateUtils.formatDateForDisplay(finalDate) : 'TBD',
    formattedTime: finalTime ? DateUtils.formatTimeForDisplay(finalTime) : 'TBD',
    timeEstimate: formatTimeEstimate(quoteResult.total_estimate_time_in_minutes),
    totalAmount: formatCurrency(quoteResult.total_estimate_amount),
    depositAmount: formatCurrency(quoteResult.deposit_amount),
    depositPaid: session.depositPaymentState?.status === 'completed' ? 'Yes' : 'No',
    remainingBalance: formatCurrency(quoteResult.total_estimate_amount - quoteResult.deposit_amount),
    paymentMethod: business.preferred_payment_method,
    paymentLink: session.depositPaymentState?.paymentLink || '',
    bookingRef: booking ? formatBookingRef(booking.id) : ''
  };

  // Add Tiga-specific data if needed
  if (business.name.toLowerCase().includes('tiga')) {
    const formattedQuoteResponse = buildQuoteToolResponse(quoteResult, business, baseData.serviceName, true);
    const tigaData = {
      ...baseData,
      workEstimate: `$${formattedQuoteResponse.work_estimate}`,
      workEstimateTime: String(formattedQuoteResponse.work_estimate_time),
      backToBaseCost: `$${formattedQuoteResponse.back_to_base_cost}`,
      backToBaseTime: String(formattedQuoteResponse.back_to_base_time),
      gstStatus: formattedQuoteResponse.gst_included ? 'Included' : 'Excluded'
    };

    // Process the Tiga template with the data
    const processedQuoteDetails = processTemplate(SMS_TEMPLATES.QUOTE_DETAILS_TIGA, tigaData);

    return {
      ...tigaData,
      quoteDetails: processedQuoteDetails
    };
  }

  // Default business data - process the template with the data
  const processedQuoteDetails = processTemplate(SMS_TEMPLATES.QUOTE_DETAILS_DEFAULT, baseData);

  return {
    ...baseData,
    quoteDetails: processedQuoteDetails
  };
};

/**
 * Simple template processor - single unified system
 */
const processTemplate = (template: string, data: Record<string, string>): string => {
  let result = template;

  // Process all template variables
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  return result;
};


export class BookingNotifications {

  /**
   * Send booking confirmation SMS
   */
  static async sendBookingConfirmation(
    session: Session,
    booking: Booking
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const customer = session.customerEntity!;
      const business = session.businessEntity!;

      // Extract all common data in one place
      const templateData = extractNotificationData(session, undefined, undefined, booking);

      const message = processTemplate(SMS_TEMPLATES.BOOKING_CONFIRMATION, templateData);
      const result = await sendText(customer.phone_number!, message, business.twilio_number!);

      if (result.success) {
        console.log(`✅ Booking confirmation sent to ${templateData.customerName}`);
      }

      return result;

    } catch (error) {
      console.error('❌ Failed to send booking confirmation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send booking reminder SMS (24 hours before)
   */
  static async sendBookingReminder(
    session: Session,
    booking: Booking
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const customer = session.customerEntity!;
      const business = session.businessEntity!;

      const templateData = extractNotificationData(session, undefined, undefined, booking);

      const message = `⏰ Reminder: Your ${templateData.businessName} booking is tomorrow!
📅 ${templateData.formattedDate} at ${templateData.formattedTime}
📍 We'll contact you 30min before arrival
Ref: ${templateData.bookingRef}`;

      const result = await sendText(customer.phone_number!, message, business.twilio_number!);

      if (result.success) {
        console.log(`✅ Booking reminder sent to ${templateData.customerName}`);
      }

      return result;

    } catch (error) {
      console.error('❌ Failed to send booking reminder:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send payment link SMS
   */
  static async sendPaymentLink(
    session: Session,
    preferredDate: string,
    preferredTime: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const customer = session.customerEntity!;
      const business = session.businessEntity!;

      const templateData = extractNotificationData(session, preferredDate, preferredTime);

      const message = processTemplate(SMS_TEMPLATES.PAYMENT_REQUIRED, templateData);
      const result = await sendText(customer.phone_number!, message, business.twilio_number!);

      if (result.success) {
        console.log(`✅ Payment link sent to ${templateData.customerName}`);
      }

      return result;

    } catch (error) {
      console.error('❌ Failed to send payment link:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send pre-booking confirmation SMS
   */
  static async sendPreBookingConfirmation(
    session: Session,
    preferredDate: string,
    preferredTime: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const customer = session.customerEntity!;
      const business = session.businessEntity!;

      const templateData = extractNotificationData(session, preferredDate, preferredTime);

      const message = processTemplate(SMS_TEMPLATES.PRE_BOOKING_CONFIRMATION, templateData);
      const result = await sendText(customer.phone_number!, message, business.twilio_number!);

      if (result.success) {
        console.log(`✅ Pre-booking confirmation sent to ${templateData.customerName}`);
      }

      return result;

    } catch (error) {
      console.error('❌ Failed to send pre-booking confirmation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
