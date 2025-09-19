/**
 * Knowledge Cache Manager
 *
 * Redis memory layer for business knowledge data
 * Manages business context caching for fast knowledge function retrieval
 */

import type { BusinessContext } from '../../../shared/lib/database/types/business-context';
import { voiceRedisClient } from '../../../agent2/sessions/redisClient';

export class KnowledgeCacheManager {
  private static readonly KNOWLEDGE_TTL = 3600; // 1 hour TTL

  /**
   * Preload all business knowledge into Redis for fast retrieval
   */
  static async preloadBusinessKnowledge(callId: string, businessContext: BusinessContext): Promise<void> {
    const { businessInfo, services, frequently_asked_questions } = businessContext;

    try {
      // Prepare all knowledge data
      const knowledgeData: Record<string, string> = {};

      // Add FAQs
      if (frequently_asked_questions && frequently_asked_questions.length > 0) {
        knowledgeData.faqs = JSON.stringify(frequently_asked_questions);
      }

      // Add detailed service information
      if (services && services.length > 0) {
        const servicesData = services.map(service => ({
          id: service.id,
          name: service.name,
          description: service.description,
          how_it_works: service.how_it_works,
          location_type: service.location_type,
          travel_charging_model: 'travel_charging_model' in service ? service.travel_charging_model : undefined,
          pricing_config: service.pricing_config
        }));
        knowledgeData.services = JSON.stringify(servicesData);
      }

      // Add business policies and details
      const businessDetails = {
        name: businessInfo.name,
        description: businessInfo.description,
        address: businessInfo.address,
        phone: businessInfo.phone,
        email: businessInfo.email,
        website: businessInfo.website,
        time_zone: businessInfo.time_zone,
        language: businessInfo.language,
        business_category: businessInfo.business_category,
        currency_code: businessInfo.currency_code,
        payment_methods: businessInfo.payment_methods,
        preferred_payment_method: businessInfo.preferred_payment_method,
        charges_deposit: businessInfo.charges_deposit,
        deposit_percentage: businessInfo.deposit_percentage,
        deposit_fixed_amount: businessInfo.deposit_fixed_amount,
        offer_mobile_services: businessInfo.offer_mobile_services,
        offer_location_services: businessInfo.offer_location_services
      };
      knowledgeData.business = JSON.stringify(businessDetails);

      // Add objection handling templates
      const objectionHandling = {
        price: {
          acknowledge: "I understand, price is an important factor.",
          clarify: "Is it the total price that feels high for your situation?",
          reframe: "This covers all the labor, travel, and careful handling — you don't need to lift a thing.",
          agreement_check: "Does that make sense for your situation?",
          safe_step: "If that fits, should I hold a time for you?"
        },
        spouse_approval: {
          acknowledge: "That makes sense, you want them to be comfortable too.",
          clarify: "Would it help if I break down the estimate so it's easier to explain?",
          reframe: "Booking a reliable team now means less stress for both of you.",
          agreement_check: "Do you think that would make the decision easier?",
          safe_step: "I can hold your slot for 24 hours while you talk with them."
        },
        service_fit: {
          acknowledge: "Got it, you want to be sure it covers what you need.",
          clarify: "Is it the packing, transport, or placement you're most concerned about?",
          reframe: "Our team handles everything end-to-end. Does that solve the part you're unsure about?",
          safe_step: "I can hold a time for you so you can decide without pressure."
        },
        hesitation: {
          acknowledge: "Totally fair, no need to rush.",
          clarify: "Is there something specific you'd like to think through?",
          reframe: "Securing a slot now prevents scrambling later. Do you agree?",
          safe_step: "I can hold it while you decide."
        }
      };
      knowledgeData.objections = JSON.stringify(objectionHandling);

      // Store all knowledge in single hash operation
      const knowledgeKey = `voice:call:${callId}:knowledge`;
      await voiceRedisClient.client.hmset(knowledgeKey, knowledgeData);
      await voiceRedisClient.expire(knowledgeKey, this.KNOWLEDGE_TTL);

      console.log(`📚 [KnowledgeCacheManager] Preloaded business knowledge for call: ${callId}`);

    } catch (error) {
      console.error(`❌ [KnowledgeCacheManager] Failed to preload knowledge for call ${callId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up knowledge data when call ends
   */
  static async cleanupCallKnowledge(callId: string): Promise<void> {
    try {
      const knowledgeKey = `voice:call:${callId}:knowledge`;
      await voiceRedisClient.del(knowledgeKey);
      console.log(`🧹 [KnowledgeCacheManager] Cleaned up knowledge for call: ${callId}`);

    } catch (error) {
      console.error(`❌ [KnowledgeCacheManager] Failed to cleanup knowledge for call ${callId}:`, error);
    }
  }
}
