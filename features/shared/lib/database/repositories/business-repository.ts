import { BaseRepository } from "../base-repository";
import type { Business } from "../types/business";
import { DateUtils } from "@/features/shared/utils/date-utils";

export class BusinessRepository extends BaseRepository<Business> {
  constructor() {
    super("businesses");
  }

  async findBusinessesAtMidnight(currentUtcTime?: string): Promise<Business[]> {
    const utcTime = currentUtcTime || DateUtils.nowUTC();
    const allBusinesses = await this.findAll();

    return allBusinesses.filter((business) =>
      DateUtils.isMidnightInTimezone(utcTime, business.time_zone)
    );
  }

  async findByTwilioAccountSid(
    twilioAccountSid: string
  ): Promise<Business | null> {
    return await this.findOne({ twilio_account_sid: twilioAccountSid });
  }
  /**
   * Build business info string from Business entity for prompt injection
   */
  buildBusinessInfoForCustomers(business: Business): string {
    const depositInfo = business.charges_deposit
      ? `Deposit Required: ${
          business.deposit_percentage
            ? business.deposit_percentage + "%"
            : business.currency_code + " " + business.deposit_fixed_amount
        }`
      : "No deposit required";

    const serviceType =
      business.offers_mobile_services && business.offers_location_services
        ? "Mobile + Location services"
        : business.offers_mobile_services
        ? "Mobile services only"
        : "Location services only";

    return `
Company: ${business.name} (${business.business_category} business)
Address: ${business.address}
Contact: ${business.phone_number} | ${business.email}${
      business.website_url ? ` | ${business.website_url}` : ""
    }
Time Zone: ${business.time_zone}
Language: ${business.language}
Currency: ${business.currency_code}
Payment Methods: ${business.payment_methods
      .map((method) => method.toString())
      .join(", ")}
Preferred Payment: ${business.preferred_payment_method.toString()}
${depositInfo}
GST: ${
      business.charges_gst
        ? `Charges GST (${
            business.prices_include_gst
              ? "prices include GST"
              : "prices exclude GST"
          })`
        : "No GST charged"
    }
Service Type: ${serviceType}
    `.trim();
  }
}
