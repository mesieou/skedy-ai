/**
 * Service Details Knowledge Tool
 *
 * Provides detailed service information from Redis cache
 */

import { voiceRedisClient } from '../../memory/redis/redis-client';
import type { FunctionCallResult } from '../types';

export interface GetServiceDetailsArgs {
  service_name: string;
}

export class ServiceDetailsTool {
  private readonly callId: string;

  constructor(callId: string) {
    this.callId = callId;
  }

  async getDetailedServiceInfo(args: GetServiceDetailsArgs): Promise<FunctionCallResult> {
    const { service_name } = args;

    try {
      // Fetch services from Redis hash
      const knowledgeKey = `voice:call:${this.callId}:knowledge`;
      const servicesData = await voiceRedisClient.hget(knowledgeKey, 'services');

      if (!servicesData) {
        return {
          success: false,
          message: "I don't have detailed service information available right now.",
          data: { error: 'no_service_data' }
        };
      }

      interface CachedService {
        id: string;
        name: string;
        description: string;
        how_it_works?: string;
        location_type: string;
        travel_charging_model?: string;
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
      const service = services.find((s: CachedService) =>
        s.name.toLowerCase() === service_name.toLowerCase()
      );

      if (!service) {
        return {
          success: false,
          message: `I don't have detailed information about "${service_name}". Let me connect you with someone who can help.`,
          data: { error: 'service_not_found', requested_service: service_name }
        };
      }

      // Format detailed service information
      let details = `**${service.name}**\n${service.description}`;

      if (service.how_it_works) {
        details += `\n\n**How it works:** ${service.how_it_works}`;
      }

      if (service.location_type) {
        const locationDesc = this.getLocationTypeDescription(service.location_type);
        details += `\n\n**Service type:** ${locationDesc}`;
      }

      if (service.pricing_config?.components?.length) {
        details += `\n\n**Pricing structure:**`;
        service.pricing_config.components.forEach((component) => {
          details += `\n• ${component.name}: `;
          component.tiers.forEach((tier, index) => {
            const quantityRange = tier.min_quantity === tier.max_quantity
              ? `${tier.min_quantity}`
              : `${tier.min_quantity}-${tier.max_quantity}`;
            details += `${quantityRange} ${this.getPricingUnit(component.pricing_combination)}: $${tier.price}`;
            if (index < component.tiers.length - 1) details += ', ';
          });
        });
      }

      return {
        success: true,
        message: details,
        data: { service, formatted_details: details }
      };

    } catch (error) {
      console.error(`❌ [ServiceDetailsTool] Error retrieving service details for call ${this.callId}:`, error);
      return {
        success: false,
        message: "I'm having trouble accessing service details right now. Let me connect you with someone who can help.",
        data: { error: 'redis_retrieval_failed' }
      };
    }
  }

  private getLocationTypeDescription(locationType: string): string {
    const descriptions: Record<string, string> = {
      'customer': 'Mobile service (we come to you)',
      'business': 'Location-based (you come to us)',
      'pickup_and_dropoff': 'Pickup and dropoff service',
    };
    return descriptions[locationType] || locationType;
  }

  private getPricingUnit(pricingCombination: string): string {
    const units: Record<string, string> = {
      'labor_per_hour_per_person': 'person/hour',
      'labor_per_minute_per_person': 'person/minute',
      'travel_per_km_per_person': 'person/km',
      'travel_per_minute_per_person': 'person/minute',
      'service_per_hour_per_person': 'person/hour',
      'service_fixed_per_service': 'per service',
    };
    return units[pricingCombination] || 'unit';
  }
}
