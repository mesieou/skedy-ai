import type { Service } from '../../../../../shared/lib/database/types/service';
import { PricingCombination } from '../../../../../shared/lib/database/types/service';

export class QuoteIdGenerator {

  /**
   * Generate descriptive quote ID using pattern: quote-{counter}-{servicename}-{tier}
   * Uses service characteristics for dynamic, business-agnostic generation
   */
  generateQuoteId(counter: number, service: Service, quantity: number): string {
    // Extract clean service name (optimized single operation)
    const serviceName = service.name
      .split(/[\s\-]+/)[0]  // Take first word
      .replace(/[^a-z0-9]/gi, '') // Remove non-alphanumeric
      .toLowerCase();

    // Generate tier name based on service pricing characteristics (no hardcoded business types)
    const tierName = this.generateTierName(service, quantity);

    return `quote-${counter}-${serviceName}-${tierName}`;
  }

  /**
   * Generate tier name based on clear pricing combination semantics
   * No complex logic needed - combinations are self-explanatory
   */
  private generateTierName(service: Service, quantity: number): string {
    if (!service.pricing_config?.components?.length) {
      return quantity === 1 ? 'single' : `${quantity}x`;
    }

    // Find the primary pricing component (first non-travel component)
    const primaryComponent = service.pricing_config.components.find(
      component => !this.isTravelComponent(component.pricing_combination)
    );

    if (!primaryComponent) {
      return quantity === 1 ? 'single' : `${quantity}x`;
    }

    const combination = primaryComponent.pricing_combination;

    // === LINEAR SCALING (per_person, per_room, per_vehicle) ===
    if (combination.includes('per_person')) {
      return `${quantity}person`;
    }
    if (combination.includes('per_room')) {
      return `${quantity}room`;
    }
    if (combination.includes('per_vehicle')) {
      return `${quantity}vehicle`;
    }

    // === TEAM RATES (bulk pricing) ===
    if (combination.includes('team_rate')) {
      return quantity === 1 ? 'solo' : `team${quantity}`;
    }

    // === SERVICE-BASED PRICING ===
    if (this.isServiceBasedPricing(combination)) {
      // For tiered services, use tier position names
      if (primaryComponent.tiers.length > 1) {
        const tierIndex = primaryComponent.tiers.findIndex(
          tier => quantity >= tier.min_quantity && quantity <= tier.max_quantity
        );
        const tierNames = ['basic', 'standard', 'premium', 'enterprise'];
        return tierNames[tierIndex] || `tier${tierIndex + 1}`;
      }
      return 'single';
    }

    // === FALLBACK ===
    return quantity === 1 ? 'single' : `${quantity}x`;
  }

  // Helper methods
  private isTravelComponent(combination: PricingCombination): boolean {
    return combination.startsWith('travel_');
  }

  private isServiceBasedPricing(combination: PricingCombination): boolean {
    return combination.startsWith('service_');
  }
}
