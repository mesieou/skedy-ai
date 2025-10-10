import type { Service, PricingComponent, PricingTier } from '../../../shared/lib/database/types/service';
import { PricingCombination, TravelChargingModel, isMobileService } from '../../../shared/lib/database/types/service';

/**
 * Dynamic pricing formatter that generates comprehensive pricing descriptions
 * for any service without hardcoding business-specific values
 */
export class PricingFormatter {

  /**
   * Generate a comprehensive pricing description that covers ALL tiers
   * Returns both a human-readable message and structured data
   */
  static formatServicePricingInfo(service: Service): {
    pricingMessage: string;
    pricingTiers: Array<{
      quantity: number;
      rate: number;
      unit: string;
      description: string;
    }>;
  } {
    if (!service.pricing_config?.components?.length) {
      return {
        pricingMessage: "Pricing information is not available for this service.",
        pricingTiers: []
      };
    }

    // Find the primary service component (non-travel)
    const serviceComponent = service.pricing_config.components.find(
      component => !this.isTravelComponent(component.pricing_combination)
    );

    if (!serviceComponent) {
      return {
        pricingMessage: "Pricing information is not available for this service.",
        pricingTiers: []
      };
    }

    // Generate tier descriptions
    const tiers = this.generateTierDescriptions(serviceComponent);
    const pricingMessage = this.generateServicePricingMessage(serviceComponent, tiers);

    return {
      pricingMessage,
      pricingTiers: tiers
    };
  }

  /**
   * Generate structured tier information from pricing component
   */
  private static generateTierDescriptions(component: PricingComponent): Array<{
    quantity: number;
    rate: number;
    unit: string;
    description: string;
  }> {
    return component.tiers.map(tier => {
      const quantity = tier.min_quantity;
      const rate = tier.price;
      const unit = this.getUnitDescription(component.pricing_combination);
      const description = this.generateTierDescription(component.pricing_combination, tier);

      return {
        quantity,
        rate,
        unit,
        description
      };
    });
  }

  /**
   * Generate service pricing message that covers all tiers
   */
  private static generateServicePricingMessage(component: PricingComponent, tiers: Array<{
    quantity: number;
    rate: number;
    unit: string;
    description: string;
  }>): string {
    const componentName = component.name.toLowerCase();

    // Sort tiers by quantity to ensure consistent ordering
    const sortedTiers = [...tiers].sort((a, b) => a.quantity - b.quantity);

    // Generate tier descriptions based on pricing combination
    const tierDescriptions = this.formatTierDescriptions(component.pricing_combination, sortedTiers);

    // Create comprehensive message
    let message = `${componentName} rates: ${tierDescriptions.join(', ')}`;

    // Add context about the pricing model
    const pricingContext = this.getPricingContext(component.pricing_combination);
    if (pricingContext) {
      message += `. ${pricingContext}`;
    }

    return message;
  }

  /**
   * Format tier descriptions based on pricing combination
   */
  private static formatTierDescriptions(combination: PricingCombination, tiers: Array<{
    quantity: number;
    rate: number;
    unit: string;
    description: string;
  }>): string[] {
    const quantityType = this.getQuantityType(combination);
    const unit = this.getUnitDescription(combination);

    return tiers.map(tier => {
      const singularType = this.getSingularQuantityType(quantityType);
      const pluralType = quantityType;

      if (this.isTeamRate(combination)) {
        // Team rates: "2 people: $160/hour"
        return `${tier.quantity} ${tier.quantity === 1 ? singularType : pluralType}: $${tier.rate}${unit}`;
      } else if (this.isPerPersonRate(combination)) {
        // Per person rates: "per person: $80/hour"
        return `per ${singularType}: $${tier.rate}${unit}`;
      } else if (this.isFixedRate(combination)) {
        // Fixed rates: "$150 fixed"
        return `$${tier.rate}${unit}`;
      } else {
        // Default format
        return `${tier.quantity} ${tier.quantity === 1 ? singularType : pluralType}: $${tier.rate}${unit}`;
      }
    });
  }

  /**
   * Generate travel pricing information with charging model explanation
   * Only shows rates if they differ from service rates, otherwise just explains the charging model
   */
  static formatTravelPricingInfo(service: Service): string | null {
    if (!isMobileService(service) || !service.pricing_config?.components?.length) {
      return null;
    }

    const travelComponent = service.pricing_config.components.find(
      component => this.isTravelComponent(component.pricing_combination)
    );

    if (!travelComponent) {
      return null;
    }

    const serviceComponent = service.pricing_config.components.find(
      component => !this.isTravelComponent(component.pricing_combination)
    );

    // Check if travel rates are the same as service rates
    const travelRatesMatchService = serviceComponent && this.doRatesMatch(travelComponent, serviceComponent);

    let travelMessage = '';

    if (travelRatesMatchService) {
      // Don't repeat the rates, just explain the charging model
      travelMessage = 'Travel is charged at the same rates';
    } else {
      // Show different travel rates
      const tiers = this.generateTierDescriptions(travelComponent);
      const sortedTiers = [...tiers].sort((a, b) => a.quantity - b.quantity);
      const tierDescriptions = this.formatTierDescriptions(travelComponent.pricing_combination, sortedTiers);
      travelMessage = `Travel rates: ${tierDescriptions.join(', ')}`;
    }

    // Add travel charging model explanation
    const chargingModelExplanation = this.getTravelChargingModelExplanation(service.travel_charging_model);
    if (chargingModelExplanation) {
      travelMessage += `. ${chargingModelExplanation}`;
    }

    return travelMessage;
  }

  /**
   * Get travel charging model explanation in simple terms
   */
  private static getTravelChargingModelExplanation(model?: TravelChargingModel): string | null {
    if (!model) return null;

    switch (model) {
      case TravelChargingModel.BETWEEN_CUSTOMER_LOCATIONS:
        return "Travel is only charged between your pickup and dropoff locations";

      case TravelChargingModel.FROM_BASE_TO_CUSTOMERS:
        return "Travel is charged from our base to your location and between locations";

      case TravelChargingModel.CUSTOMERS_AND_BACK_TO_BASE:
        return "Travel is charged between locations and for returning to our base";

      case TravelChargingModel.BETWEEN_CUSTOMERS_AND_BACK_TO_BASE:
        return "Travel is charged between your locations and for returning to our base";

      case TravelChargingModel.FROM_BASE_AND_BETWEEN_CUSTOMERS:
        return "Travel is charged from our base to your first location and between locations";

      case TravelChargingModel.FULL_ROUTE:
        return "Travel is charged for the entire route including to and from our base";

      default:
        return null;
    }
  }

  /**
   * Generate description for a single tier
   */
  private static generateTierDescription(combination: PricingCombination, tier: PricingTier): string {
    const unit = this.getUnitDescription(combination);
    const quantityType = this.getQuantityType(combination);
    const singularType = this.getSingularQuantityType(quantityType);
    const quantity = tier.min_quantity;
    const rate = tier.price;

    if (this.isTeamRate(combination)) {
      return `${quantity} ${quantity === 1 ? singularType : quantityType} team: $${rate}${unit}`;
    } else if (this.isPerPersonRate(combination)) {
      return `Per ${singularType}: $${rate}${unit}`;
    } else {
      return `${quantity} ${quantity === 1 ? singularType : quantityType}: $${rate}${unit}`;
    }
  }

  /**
   * Get unit description (per hour, per minute, etc.)
   */
  private static getUnitDescription(combination: PricingCombination): string {
    if (combination.includes('per_hour')) {
      return '/hour';
    } else if (combination.includes('per_minute')) {
      return '/minute';
    } else if (combination.includes('per_km')) {
      return '/km';
    } else if (combination.includes('per_sqm')) {
      return '/sqm';
    } else if (combination.includes('per_room')) {
      return '/room';
    } else if (combination.includes('fixed')) {
      return ' (fixed)';
    }
    return '/hour'; // Default fallback
  }

  /**
   * Get pricing type description for context
   */
  private static getPricingTypeDescription(combination: PricingCombination): string {
    if (combination.includes('per_hour')) {
      return 'hourly';
    } else if (combination.includes('per_minute')) {
      return 'per minute';
    } else if (combination.includes('per_km')) {
      return 'per kilometer';
    } else if (combination.includes('fixed')) {
      return 'fixed rate';
    }
    return 'hourly'; // Default fallback
  }

  /**
   * Get quantity type (people, vehicles, rooms, etc.)
   */
  private static getQuantityType(combination: PricingCombination): string {
    if (combination.includes('per_person') || combination.includes('team_rate')) {
      return 'people';
    } else if (combination.includes('per_vehicle')) {
      return 'vehicles';
    } else if (combination.includes('per_room')) {
      return 'rooms';
    } else if (combination.includes('per_sqm')) {
      return 'square meters';
    }
    return 'people'; // Default fallback
  }

  /**
   * Get singular form of quantity type
   */
  private static getSingularQuantityType(pluralType: string): string {
    switch (pluralType) {
      case 'people':
        return 'person';
      case 'vehicles':
        return 'vehicle';
      case 'rooms':
        return 'room';
      case 'square meters':
        return 'square meter';
      default:
        return pluralType;
    }
  }

  /**
   * Get pricing context explanation
   */
  private static getPricingContext(combination: PricingCombination): string | null {
    if (this.isTeamRate(combination)) {
      return "These are team rates - the total cost for the entire team";
    } else if (this.isPerPersonRate(combination)) {
      return "These are per-person rates - multiply by team size for total cost";
    } else if (this.isFixedRate(combination)) {
      return "This is a fixed rate regardless of team size";
    }
    return null;
  }

  /**
   * Check if pricing combination is a team rate
   */
  private static isTeamRate(combination: PricingCombination): boolean {
    return combination.includes('team_rate');
  }

  /**
   * Check if pricing combination is per person
   */
  private static isPerPersonRate(combination: PricingCombination): boolean {
    return combination.includes('per_person');
  }

  /**
   * Check if pricing combination is fixed rate
   */
  private static isFixedRate(combination: PricingCombination): boolean {
    return combination.includes('fixed');
  }

  /**
   * Check if a pricing combination is travel-related
   */
  private static isTravelComponent(combination: PricingCombination): boolean {
    return combination.startsWith('travel_');
  }

  /**
   * Check if two pricing components have matching rates
   */
  private static doRatesMatch(component1: PricingComponent, component2: PricingComponent): boolean {
    // Must have same number of tiers
    if (component1.tiers.length !== component2.tiers.length) {
      return false;
    }

    // Sort both tier arrays by min_quantity for comparison
    const tiers1 = [...component1.tiers].sort((a, b) => a.min_quantity - b.min_quantity);
    const tiers2 = [...component2.tiers].sort((a, b) => a.min_quantity - b.min_quantity);

    // Compare each tier
    for (let i = 0; i < tiers1.length; i++) {
      if (
        tiers1[i].min_quantity !== tiers2[i].min_quantity ||
        tiers1[i].max_quantity !== tiers2[i].max_quantity ||
        tiers1[i].price !== tiers2[i].price
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate a complete service pricing overview including both service and travel
   */
  static generateCompletePricingOverview(service: Service): string {
    const serviceInfo = this.formatServicePricingInfo(service);
    const travelInfo = this.formatTravelPricingInfo(service);

    let overview = serviceInfo.pricingMessage;

    if (travelInfo) {
      overview += `. ${travelInfo}`;
    }

    overview += '. GST is not included in these rates';

    return overview;
  }
}
