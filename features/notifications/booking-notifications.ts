import { sendText } from './sentText';
import type { Booking } from '../shared/lib/database/types/bookings';
import type { User } from '../shared/lib/database/types/user';
import type { Session } from '../agent/sessions/session';
import type { BookingAddress } from '../scheduling/lib/types/booking-calculations';
import { AddressRole } from '../scheduling/lib/types/booking-calculations';
import { DateUtils } from '../shared/utils/date-utils';

/**
 * Booking notification service - handles all SMS notifications
 */

// SMS Templates
const SMS_TEMPLATES = {
  QUOTE_DETAILS: `👤 CUSTOMER DETAILS:
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
- {businessName}
`,
  PAYMENT_REQUIRED: `💳 PAYMENT REQUIRED
Hi {customerName} 😊!

Please complete your deposit payment to secure your booking with {businessName}.
💰 Deposit Required: {depositAmount}
🔗 Payment Link: {paymentLink}

⚠️ Your booking is not confirmed until payment is completed.

📋 Quote Details:
{QUOTE_DETAILS}`,

  BOOKING_CONFIRMATION: `🎉 Hi {customerName} 😊! Your booking is confirmed with {businessName}

📋 Booking Details:
{QUOTE_DETAILS}
`,

  PRE_BOOKING_CONFIRMATION: `Hi {customerName} 😊!

Can you please confirm all details are correct?

📋 Booking Details:
{QUOTE_DETAILS}
`
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

const formatAddressesByRole = (addresses: BookingAddress[], role: AddressRole): string => {
  const filtered = addresses.filter(addr => addr.role === role);
  if (filtered.length === 0) return 'Not specified';

  return filtered
    .map((addr, index) => `${index + 1}. ${formatAddress(addr)}`)
    .join('\n');
};

const processTemplate = (template: string, data: Record<string, string>): string => {
  let result = template;

  // First, process nested templates like {QUOTE_DETAILS}
  if (result.includes('{QUOTE_DETAILS}')) {
    const quoteDetailsData = {
      fullName: data.fullName || '',
      customerPhone: data.customerPhone || '',
      customerEmail: data.customerEmail || '',
      serviceName: data.serviceName || '',
      numberOfRemovalists: data.numberOfRemovalists || '',
      pickupText: data.pickupText || '',
      dropoffText: data.dropoffText || '',
      formattedDate: data.formattedDate || '',
      formattedTime: data.formattedTime || '',
      timeEstimate: data.timeEstimate || '',
      totalAmount: data.totalAmount || '',
      depositAmount: data.depositAmount || '',
      depositPaid: data.depositPaid || '',
      remainingBalance: data.remainingBalance || '',
      paymentMethod: data.paymentMethod || '',
      businessPhone: data.businessPhone || '',
      businessName: data.businessName || ''
    };

    const processedQuoteDetails = processTemplate(SMS_TEMPLATES.QUOTE_DETAILS, quoteDetailsData);
    result = result.replace('{QUOTE_DETAILS}', processedQuoteDetails);
  }

  // Then process all other template variables
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

      const { date, time } = DateUtils.convertUTCToTimezone(booking.start_at, business.time_zone);
      const { time: endTime } = DateUtils.convertUTCToTimezone(booking.end_at, business.time_zone);

      // Get quote data from session (validated by tools)
      const quoteRequest = session.selectedQuote!.request;
      const serviceName = quoteRequest.services[0]?.service?.name;
      const serviceQuantity = quoteRequest.services[0]?.quantity || 1;

      const templateData = {
        customerName: formatCustomerName(customer),
        businessName: business.name,
        serviceName: serviceName!,
        date,
        time,
        endTime,
        totalAmount: formatCurrency(booking.total_estimate_amount),
        depositAmount: formatCurrency(booking.deposit_amount),
        businessPhone: business.phone_number,
        businessEmail: business.email,
        bookingRef: formatBookingRef(booking.id),
        // Additional data for QUOTE_DETAILS
        fullName: formatFullName(customer),
        customerPhone: customer.phone_number!,
        customerEmail: customer.email || '',
        numberOfRemovalists: (serviceQuantity * business.number_of_providers).toString(),
        pickupText: formatAddressesByRole(quoteRequest.addresses || [], AddressRole.PICKUP),
        dropoffText: formatAddressesByRole(quoteRequest.addresses || [], AddressRole.DROPOFF),
        formattedDate: date,
        formattedTime: time,
        timeEstimate: formatTimeEstimate(booking.total_estimate_time_in_minutes),
        depositPaid: booking.deposit_paid ? 'Yes' : 'No',
        remainingBalance: formatCurrency(booking.remaining_balance),
        paymentMethod: business.preferred_payment_method
      };

      const message = processTemplate(SMS_TEMPLATES.BOOKING_CONFIRMATION, templateData);
      const result = await sendText(customer.phone_number!, message, business.twilio_number!);

      if (result.success) {
        console.log(`✅ Booking confirmation sent to ${formatCustomerName(customer)}`);
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

      const { date, time } = DateUtils.convertUTCToTimezone(booking.start_at, business.time_zone);
      const bookingRef = formatBookingRef(booking.id);

      const message = `⏰ Reminder: Your ${business.name} booking is tomorrow!
📅 ${date} at ${time}
📍 We'll contact you 30min before arrival
Ref: ${bookingRef}`;

      const result = await sendText(customer.phone_number!, message, business.twilio_number!);

      if (result.success) {
        console.log(`✅ Booking reminder sent to ${formatCustomerName(customer)}`);
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
      const quoteResult = session.selectedQuote!.result;
      const quoteRequest = session.selectedQuote!.request;
      const paymentLink = session.depositPaymentState!.paymentLink;

      const serviceName = quoteRequest.services[0]?.service?.name;

      const pickupText = formatAddressesByRole(quoteRequest.addresses || [], AddressRole.PICKUP);
      const dropoffText = formatAddressesByRole(quoteRequest.addresses || [], AddressRole.DROPOFF);

      const templateData = {
        customerName: formatCustomerName(customer),
        businessName: business.name,
        serviceName: serviceName!,
        depositAmount: formatCurrency(quoteResult.deposit_amount),
        paymentLink: paymentLink!,
        businessPhone: business.phone_number!,
        // Additional data for QUOTE_DETAILS
        fullName: formatFullName(customer),
        customerPhone: customer.phone_number!,
        customerEmail: customer.email || '',
        numberOfRemovalists: business.number_of_providers.toString(),
        pickupText,
        dropoffText,
        formattedDate: DateUtils.formatDateForDisplay(preferredDate),
        formattedTime: DateUtils.formatTimeForDisplay(preferredTime),
        timeEstimate: formatTimeEstimate(quoteResult.total_estimate_time_in_minutes),
        totalAmount: formatCurrency(quoteResult.total_estimate_amount),
        depositPaid: session.depositPaymentState?.status === 'completed' ? 'Yes' : 'No',
        remainingBalance: formatCurrency(quoteResult.total_estimate_amount),
        paymentMethod: business.preferred_payment_method
      };

      const message = processTemplate(SMS_TEMPLATES.PAYMENT_REQUIRED, templateData);
      const result = await sendText(customer.phone_number!, message, business.twilio_number!);

      if (result.success) {
        console.log(`✅ Payment link sent to ${formatCustomerName(customer)}`);
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
      const quote = session.selectedQuote!;
      const quoteRequest = quote.request;

      const pickupText = formatAddressesByRole(quoteRequest.addresses || [], AddressRole.PICKUP);
      const dropoffText = formatAddressesByRole(quoteRequest.addresses || [], AddressRole.DROPOFF);
      const serviceName = quoteRequest.services[0]?.service?.name;
      const serviceQuantity = quoteRequest.services?.[0]?.quantity || 1;

      // Use provided date/time (validated by tools)
      const finalPreferredDate = preferredDate;
      const finalPreferredTime = preferredTime;

      const templateData = {
        customerName: formatCustomerName(customer),
        fullName: formatFullName(customer),
        customerPhone: customer.phone_number!,
        customerEmail: customer.email || '',
        serviceName: serviceName!,
        totalAmount: formatCurrency(quote.result.total_estimate_amount),
        depositAmount: formatCurrency(quote.result.deposit_amount),
        timeEstimate: formatTimeEstimate(quote.result.total_estimate_time_in_minutes),
        pickupText,
        dropoffText,
        formattedDate: DateUtils.formatDateForDisplay(finalPreferredDate),
        formattedTime: DateUtils.formatTimeForDisplay(finalPreferredTime),
        businessPhone: business.phone_number!,
        businessName: business.name,
        // Additional data for QUOTE_DETAILS
        numberOfRemovalists: (serviceQuantity * business.number_of_providers).toString(),
        depositPaid: session.depositPaymentState?.status === 'completed' ? 'Yes' : 'No',
        remainingBalance: formatCurrency(quote.result.total_estimate_amount - quote.result.deposit_amount),
        paymentMethod: business.preferred_payment_method
      };

      const message = processTemplate(SMS_TEMPLATES.PRE_BOOKING_CONFIRMATION, templateData);
      const result = await sendText(customer.phone_number!, message, business.twilio_number!);

      if (result.success) {
        console.log(`✅ Pre-booking confirmation sent to ${formatCustomerName(customer)}`);
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
