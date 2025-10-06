import { BaseRepository } from "../base-repository";
import type { Business } from "../types/business";
import { DateUtils } from "@/features/shared/utils/date-utils";
import assert from "assert";

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

  async findByTwilioNumber(
    twilioNumber: string
  ): Promise<Business | null> {
    return await this.findOne({ twilio_number: twilioNumber });
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

  /**
   * Get OpenAI API key for a business based on their openai_api_key_name
   */
  static getApiKeyForBusiness(business: Business): string {
    assert(business?.openai_api_key_name, 'Business must have openai_api_key_name field');

    const envVarName = `OPENAI_API_KEY_${business.openai_api_key_name}`;
    const apiKey = process.env[envVarName];

    assert(apiKey, `Environment variable ${envVarName} not found for business ${business.name}`);
    return apiKey;
  }

  /**
   * Get OpenAI webhook secret for a business based on their openai_api_key_name
   */
  static getWebhookSecretForBusiness(business: Business): string {
    assert(business?.openai_api_key_name, 'Business must have openai_api_key_name field');

    const envVarName = `OPENAI_WEBHOOK_SECRET_${business.openai_api_key_name}`;
    const webhookSecret = process.env[envVarName];

    assert(webhookSecret, `Environment variable ${envVarName} not found for business ${business.name}`);
    return webhookSecret;
  }
}
