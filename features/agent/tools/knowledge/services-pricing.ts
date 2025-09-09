/**
 * Services & Pricing Knowledge Tool
 *
 * Handles specific questions about service pricing, what's included, how services work
 */

import { voiceRedisClient } from '../../memory/redis/redis-client';
import type { FunctionCallResult } from '../types';

export interface GetServicesPricingArgs {
  service_name?: string; // Optional: specific service, or general pricing info
}

export class ServicesPricingTool {
  private readonly callId: string;

  constructor(callId: string) {
    this.callId = callId;
  }

  async getServicesPricingInfo(args: GetServicesPricingArgs = {}): Promise<FunctionCallResult> {
    const { service_name } = args;

    try {
      // Fetch services from Redis hash
      const knowledgeKey = `voice:call:${this.callId}:knowledge`;
      const servicesData = await voiceRedisClient.hget(knowledgeKey, 'services');

      if (!servicesData) {
        return {
          success: false,
          message: "I don't have pricing information available right now. Let me connect you with someone who can help.",
          data: { error: 'no_services_data' }
        };
      }

      interface CachedService {
        id: string;
        name: string;
        description: string;
        how_it_works?: string;
        pricing_config?: {
          components: Array<{
            name: string;
            pricing_combination: string;
            tiers: Array<{
              min_quantity: number;
              max_quantity: number;
              price: number;
            }>;
          }>;
        };
      }

      const services: CachedService[] = JSON.parse(servicesData);

      if (service_name) {
        // Specific service pricing
        const service = services.find((s: CachedService) =>
          s.name.toLowerCase().includes(service_name.toLowerCase())
        );

        if (!service) {
          return {
            success: false,
            message: `I don't have pricing information for "${service_name}". Let me show you what services we do offer.`,
            data: {
              error: 'service_not_found',
              available_services: services.map(s => s.name)
            }
          };
        }

        // Format specific service pricing
        let details = `**${service.name}**\n${service.description}`;

        if (service.how_it_works) {
          details += `\n\n**How it works:** ${service.how_it_works}`;
        }

        if (service.pricing_config?.components?.length) {
          details += `\n\n**Pricing:**`;
          service.pricing_config.components.forEach((component) => {
            details += `\n• **${component.name}**: `;
            component.tiers.forEach((tier, index) => {
              const quantityRange = tier.min_quantity === tier.max_quantity
                ? `${tier.min_quantity}`
                : `${tier.min_quantity}-${tier.max_quantity}`;
              details += `$${tier.price} for ${quantityRange} ${this.getPricingUnit(component.pricing_combination)}`;
              if (index < component.tiers.length - 1) details += ', ';
            });
          });
        }

        return {
          success: true,
          message: details,
          data: { service, type: 'specific_service' }
        };

      } else {
        // General pricing overview
        const serviceOverview = services.map(service => {
          let info = `**${service.name}**: ${service.description}`;

          if (service.pricing_config?.components?.length) {
            const firstComponent = service.pricing_config.components[0];
            const startingPrice = firstComponent.tiers[0]?.price;
            if (startingPrice) {
              info += ` (Starting from $${startingPrice})`;
            }
          }

          return info;
        }).join('\n\n');

        return {
          success: true,
          message: `Here are our services and pricing:\n\n${serviceOverview}\n\nWhich service interests you most?`,
          data: { services, type: 'general_overview' }
        };
      }

    } catch (error) {
      console.error(`❌ [ServicesPricingTool] Error retrieving services/pricing for call ${this.callId}:`, error);
      return {
        success: false,
        message: "I'm having trouble accessing pricing information right now. Let me connect you with someone who can help.",
        data: { error: 'redis_retrieval_failed' }
      };
    }
  }

  private getPricingUnit(pricingCombination: string): string {
    const units: Record<string, string> = {
      'labor_per_hour_per_person': 'person/hour',
      'travel_per_km_per_person': 'person/km',
      'service_per_hour_per_person': 'person/hour',
      'service_fixed_per_service': 'service',
    };
    return units[pricingCombination] || 'unit';
  }
}
