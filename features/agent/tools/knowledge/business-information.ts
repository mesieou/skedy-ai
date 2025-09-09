/**
 * Business Information Knowledge Tool
 *
 * Handles questions about business operations, policies, hours, areas served
 */

import { voiceRedisClient } from '../../memory/redis/redis-client';
import type { FunctionCallResult } from '../types';

export interface GetBusinessInformationArgs {
  query?: string; // Optional: filter by topic like 'hours', 'areas', 'insurance'
}

export class BusinessInformationTool {
  private readonly callId: string;

  constructor(callId: string) {
    this.callId = callId;
  }

  async getBusinessInformation(args: GetBusinessInformationArgs = {}): Promise<FunctionCallResult> {
    const { query } = args;

    try {
      // Fetch business data from Redis hash
      const knowledgeKey = `voice:call:${this.callId}:knowledge`;
      const businessData = await voiceRedisClient.hget(knowledgeKey, 'business');

      if (!businessData) {
        return {
          success: false,
          message: "I don't have business information available right now.",
          data: { error: 'no_business_data' }
        };
      }

      const business = JSON.parse(businessData);
      let response = '';

      // Handle specific queries or provide general info
      if (query) {
        const searchTerm = query.toLowerCase();

        if (searchTerm.includes('hour') || searchTerm.includes('time')) {
          response = `We operate in ${business.time_zone} timezone. Contact us at ${business.phone} for current operating hours.`;

        } else if (searchTerm.includes('area') || searchTerm.includes('location') || searchTerm.includes('serve')) {
          response = `We're based at ${business.address}. `;
          if (business.offer_mobile_services && business.offer_location_services) {
            response += `We offer both mobile services (we come to you) and location-based services (you come to us).`;
          } else if (business.offer_mobile_services) {
            response += `We provide mobile services - we come to your location.`;
          } else if (business.offer_location_services) {
            response += `We operate from our location - customers come to us.`;
          }

        } else if (searchTerm.includes('deposit') || searchTerm.includes('payment')) {
          if (business.charges_deposit) {
            if (business.deposit_fixed_amount) {
              response = `We require a $${business.deposit_fixed_amount} deposit. `;
            } else if (business.deposit_percentage) {
              response = `We require a ${business.deposit_percentage}% deposit. `;
            }
          } else {
            response = `No deposit required. `;
          }
          response += `We accept: ${business.payment_methods.join(', ')}. Preferred payment: ${business.preferred_payment_method}.`;

        } else if (searchTerm.includes('contact') || searchTerm.includes('phone') || searchTerm.includes('email')) {
          response = `You can reach us at ${business.phone} or ${business.email}. `;
          if (business.website) {
            response += `Visit our website: ${business.website}`;
          }

        } else {
          // General business info
          response = this.buildGeneralBusinessInfo(business);
        }

      } else {
        // No specific query - provide general business info
        response = this.buildGeneralBusinessInfo(business);
      }

      return {
        success: true,
        message: response,
        data: {
          business_info: business,
          query_type: query || 'general',
          response_category: 'business_information'
        }
      };

    } catch (error) {
      console.error(`❌ [BusinessInformationTool] Error retrieving business info for call ${this.callId}:`, error);
      return {
        success: false,
        message: "I'm having trouble accessing business information right now. Let me connect you with someone who can help.",
        data: { error: 'redis_retrieval_failed' }
      };
    }
  }

  private buildGeneralBusinessInfo(business: Record<string, unknown>): string {
    let info = `**${business.name}** - ${business.description}\n\n`;
    info += `📍 **Location**: ${business.address}\n`;
    info += `📞 **Contact**: ${business.phone}`;
    if (business.email) info += ` | ${business.email}`;
    if (business.website) info += ` | ${business.website}`;
    info += `\n`;

    // Service delivery info
    if (business.offer_mobile_services && business.offer_location_services) {
      info += `🚗 **Service**: Both mobile (we come to you) and location-based (you come to us)\n`;
    } else if (business.offer_mobile_services) {
      info += `🚗 **Service**: Mobile - we come to your location\n`;
    } else if (business.offer_location_services) {
      info += `🏢 **Service**: Location-based - you come to us\n`;
    }

    // Payment info
    if (business.charges_deposit) {
      if (business.deposit_fixed_amount) {
        info += `💳 **Deposit**: $${business.deposit_fixed_amount} required\n`;
      } else if (business.deposit_percentage) {
        info += `💳 **Deposit**: ${business.deposit_percentage}% required\n`;
      }
    } else {
      info += `💳 **Deposit**: None required\n`;
    }

    return info;
  }
}
