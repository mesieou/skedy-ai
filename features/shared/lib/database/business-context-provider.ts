import { BusinessRepository } from './repositories/business-repository';
import { ServiceRepository } from './repositories/service-repository';
import type { BusinessContext } from './types/business-context';
import type { Business } from './types/business';
import { BusinessCategory, PaymentMethod } from './types/business';
import type { Service } from './types/service';
import type { FrequentQuestion } from './types/frequent-questions';

export class BusinessContextProvider {
  private businessRepo: BusinessRepository;
  private serviceRepo: ServiceRepository;

  constructor() {
    this.businessRepo = new BusinessRepository();
    this.serviceRepo = new ServiceRepository();
  }



  /**
   * Get business context by Twilio Account SID (for incoming calls via Twilio)
   */
  async getBusinessContextByTwilioSid(twilioAccountSid: string): Promise<BusinessContext> {
    console.log(`📋 Building business context for Twilio SID: ${twilioAccountSid}`);

    // Fetch business data by Twilio Account SID
    const business = await this.businessRepo.findOne({ twilio_account_sid: twilioAccountSid });
    if (!business) {
      throw new Error(`Business not found for Twilio Account SID: ${twilioAccountSid}`);
    }

    return this.buildContextFromBusiness(business);
  }

  /**
   * Build context from business entity
   */
  private async buildContextFromBusiness(business: Business): Promise<BusinessContext> {
    // Fetch services for this business
    const services = await this.getBusinessServices(business.id);

    // Get FAQs (you may need to implement this repository)
    const faqs = await this.getBusinessFAQs(business.id);

    // Build context object
    const context: BusinessContext = {
      businessInfo: this.buildBusinessInfo(business),
      services: services,
      frequently_asked_questions: faqs,
    };

    console.log(`✅ Business context built - ${services.length} services, ${faqs.length} FAQs`);
    return context;
  }



  /**
   * Build business info from Business entity
   */
  private buildBusinessInfo(business: Business) {
    return {
      name: business.name,
      description: `${this.getCategoryDescription(business.business_category)} business`,
      address: business.address,
      phone: business.phone_number,
      email: business.email,
      website: business.website_url || '',
      time_zone: business.time_zone,
      language: business.language,
      business_category: business.business_category,
      currency_code: business.currency_code,
      payment_methods: business.payment_methods.map(method => this.getPaymentMethodDescription(method)),
      preferred_payment_method: this.getPaymentMethodDescription(business.preferred_payment_method),
      charges_deposit: business.charges_deposit,
      deposit_percentage: business.deposit_percentage ?? undefined,
      deposit_fixed_amount: business.deposit_fixed_amount ?? undefined,
      offer_mobile_services: business.offers_mobile_services,
      offer_location_services: business.offers_location_services,
    };
  }

  /**
   * Get services for business
   */
  private async getBusinessServices(businessId: string): Promise<Service[]> {
    try {
      // You may need to implement this method in ServiceRepository
      return await this.serviceRepo.findAll({}, { business_id: businessId });
    } catch (error) {
      console.warn(`⚠️ Could not fetch services for business ${businessId}:`, error);
      return [];
    }
  }

  /**
   * Get FAQs for business (placeholder - implement when FAQ repository exists)
   */
  private async getBusinessFAQs(businessId: string): Promise<FrequentQuestion[]> {
    try {
      // TODO: Implement FrequentQuestionRepository when available
      console.log(`📋 FAQ repository not implemented yet for business: ${businessId}`);
      return [];
    } catch (error) {
      console.warn(`⚠️ Could not fetch FAQs for business ${businessId}:`, error);
      return [];
    }
  }

  /**
   * Format business context for LLM consumption
   */
  private formatContextForLLM(context: BusinessContext): string {
    const { businessInfo, services, frequently_asked_questions } = context;

    let prompt = `## Business Information\n`;
    prompt += `**Company**: ${businessInfo.name}\n`;
    prompt += `**Type**: ${businessInfo.business_category} (${businessInfo.description})\n`;
    prompt += `**Location**: ${businessInfo.address}\n`;
    prompt += `**Contact**: ${businessInfo.phone} | ${businessInfo.email}\n`;
    prompt += `**Website**: ${businessInfo.website || 'Not available'}\n`;
    prompt += `**Timezone**: ${businessInfo.time_zone}\n`;
    prompt += `**Language**: ${businessInfo.language}\n\n`;

    // Service options
    prompt += `## Service Options\n`;
    if (businessInfo.offer_mobile_services && businessInfo.offer_location_services) {
      prompt += `**Service Locations**: We offer both mobile services (we come to you) and location-based services (you come to us)\n`;
    } else if (businessInfo.offer_mobile_services) {
      prompt += `**Service Locations**: Mobile service only - we come to your location\n`;
    } else if (businessInfo.offer_location_services) {
      prompt += `**Service Locations**: Location-based service only - customers come to our location\n`;
    }
    prompt += `\n`;

    // Payment information
    prompt += `## Payment Information\n`;
    prompt += `**Currency**: ${businessInfo.currency_code}\n`;
    prompt += `**Accepted Payments**: ${businessInfo.payment_methods.join(', ')}\n`;
    prompt += `**Preferred Payment**: ${businessInfo.preferred_payment_method}\n`;

    if (businessInfo.charges_deposit) {
      if (businessInfo.deposit_percentage) {
        prompt += `**Deposit Required**: ${businessInfo.deposit_percentage}% of total amount\n`;
      } else if (businessInfo.deposit_fixed_amount) {
        prompt += `**Deposit Required**: ${businessInfo.currency_code} ${businessInfo.deposit_fixed_amount} fixed amount\n`;
      }
    } else {
      prompt += `**Deposit**: No deposit required\n`;
    }
    prompt += `\n`;

    // Services offered
    if (services.length > 0) {
      prompt += `## Services Offered\n`;
      services.forEach((service, index) => {
        prompt += `${index + 1}. **${service.name}**\n`;
        prompt += `   - ${service.description}\n`;
        prompt += `   - Location: ${this.getLocationTypeDescription(service.location_type)}\n`;

        if (service.pricing_config?.components?.length) {
          prompt += `   - Pricing: `;
          const pricingDescriptions = service.pricing_config.components.map(component => {
            const firstTier = component.tiers[0];
            return `${component.name} - ${businessInfo.currency_code} ${firstTier.price}`;
          });
          prompt += pricingDescriptions.join(', ');
          prompt += `\n`;
        }
        prompt += `\n`;
      });
    }

    // FAQs
    if (frequently_asked_questions.length > 0) {
      prompt += `## Frequently Asked Questions\n`;
      frequently_asked_questions.forEach((faq, index) => {
        prompt += `**Q${index + 1}**: ${faq.title}\n`;
        prompt += `**A**: ${faq.content}\n\n`;
      });
    }

    prompt += `## Instructions for AI Assistant\n`;
    prompt += `- You are representing ${businessInfo.name}\n`;
    prompt += `- Be helpful and professional\n`;
    prompt += `- Provide accurate information about our services and pricing\n`;
    prompt += `- Help customers with booking inquiries\n`;
    prompt += `- Direct payment questions to our preferred method: ${businessInfo.preferred_payment_method}\n`;
    prompt += `- Always confirm service location (mobile vs location-based)\n`;
    prompt += `- Keep responses concise for phone conversations\n`;

    return prompt;
  }

  /**
   * Get human-readable category description
   */
  private getCategoryDescription(category: BusinessCategory): string {
    const descriptions = {
      [BusinessCategory.TRANSPORT]: 'Transportation and moving',
      [BusinessCategory.CLEANING]: 'Cleaning and maintenance',
      [BusinessCategory.HANDYMAN]: 'Handyman and repair',
      [BusinessCategory.GARDENING]: 'Gardening and landscaping',
      [BusinessCategory.BEAUTY]: 'Beauty and wellness',
      [BusinessCategory.FITNESS]: 'Fitness and health',
      [BusinessCategory.OTHER]: 'General services',
    };
    return descriptions[category] || category;
  }

  /**
   * Get human-readable payment method description
   */
  private getPaymentMethodDescription(method: PaymentMethod): string {
    const descriptions = {
      [PaymentMethod.CREDIT_CARD]: 'Credit Card',
      [PaymentMethod.BANK_TRANSFER]: 'Bank Transfer',
      [PaymentMethod.CASH]: 'Cash',
      [PaymentMethod.PAYPAL]: 'PayPal',
      [PaymentMethod.STRIPE]: 'Stripe',
    };
    return descriptions[method] || method;
  }

  /**
   * Get human-readable location type description
   */
  private getLocationTypeDescription(locationType: string): string {
    const descriptions: Record<string, string> = {
      'customer': 'Mobile service (we come to you)',
      'business': 'Location-based (you come to us)',
      'pickup_and_dropoff': 'Pickup and dropoff service',
    };
    return descriptions[locationType] || locationType;
  }

      /**
   * Get business context formatted for LLM by phone number
   */
  async getBusinessContextByPhoneForLLM(phoneNumber: string): Promise<string> {
    const context = await this.getBusinessContextByTwilioSid(phoneNumber);
    return this.formatContextForLLM(context);
  }
}

// Export singleton instance for easy use
export const businessContextProvider = new BusinessContextProvider();
