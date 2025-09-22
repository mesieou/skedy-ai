import type { PricingComponent, PricingTier } from '../../../../../shared/lib/database/types/service';
import { PricingCombination } from '../../../../../shared/lib/database/types/service';
import type { ServiceBreakdown, ServiceWithQuantity } from '../../../types/booking-calculations';

export class ComponentCalculator {

  /**
   * Calculate cost for a single service (excluding travel)
   */
  async calculateServiceCost(
    serviceItem: ServiceWithQuantity,
    jobScope?: string
  ): Promise<ServiceBreakdown> {
    const { service, quantity } = serviceItem;
    console.log(`💼 Calculating service cost for: ${service.name}, quantity: ${quantity}, job_scope: ${jobScope}`);
    let service_cost = 0;
    let estimated_duration_mins = 0;

    if (!service.pricing_config) {
      throw new Error(`Service ${service.name} has no pricing configuration`);
    }

    // Loop through pricing components (excluding travel components)
    for (const component of service.pricing_config.components) {
      // Skip travel components - they're calculated at booking level now
      if (this.isTravelComponent(component.pricing_combination)) {
        continue;
      }

      const componentCost = await this.calculateComponentCost(
        component,
        quantity,
        jobScope
      );

      service_cost += componentCost.cost;
      estimated_duration_mins += componentCost.duration_mins;
    }

    return {
      service_id: service.id,
      service_name: service.name,
      quantity,
      service_cost: Math.round(service_cost),
      total_cost: Math.round(service_cost), // No travel cost added here
      estimated_duration_mins,
      component_breakdowns: [],
    };
  }

  /**
   * Calculate cost for a single pricing component using configuration-driven approach
   */
  private async calculateComponentCost(
    component: PricingComponent,
    quantity: number,
    jobScope?: string
  ): Promise<{ cost: number; duration_mins: number }> {
    // Find the appropriate tier based on quantity
    const tier = this.findApplicableTier(component.tiers, quantity);
    if (!tier) {
      throw new Error(
        `No pricing tier found for quantity ${quantity} in component ${component.name}`
      );
    }

    // Get pricing configuration for this combination
    const pricingConfig = this.getPricingConfig(component.pricing_combination);
    if (!pricingConfig) {
      throw new Error(`Unsupported pricing combination: ${component.pricing_combination}`);
    }

    // Calculate duration
    const duration_mins = pricingConfig.usesDuration
      ? this.getEstimatedDuration(tier.duration_estimate_mins, jobScope)
      : 0;

    // Calculate cost using the configuration
    let cost = tier.price;

    // Apply time multiplier (for hourly rates)
    if (pricingConfig.timeMultiplier && duration_mins > 0) {
      cost *= (duration_mins / pricingConfig.timeMultiplier);
    }

    // Apply quantity multiplier (for per-person rates)
    if (pricingConfig.quantityMultiplier) {
      cost *= quantity;
    }

    // Log calculation
    this.logCalculation(pricingConfig, duration_mins, tier.price, quantity, cost);

    return { cost, duration_mins };
  }

  /**
   * Get pricing configuration for a combination - eliminates repetitive switch cases
   */
  private getPricingConfig(combination: PricingCombination) {
    const configs: Record<string, {
      usesDuration: boolean;
      timeMultiplier?: number; // 60 for hourly, 1 for per minute, undefined for fixed
      quantityMultiplier: boolean; // true for per-person, false for team/fixed rates
      category: string;
      unit: string;
    }> = {
      // === PER PERSON RATES (linear scaling) ===
      [PricingCombination.LABOR_PER_HOUR_PER_PERSON]: {
        usesDuration: true, timeMultiplier: 60, quantityMultiplier: true,
        category: 'Labor', unit: 'hour/person'
      },
      [PricingCombination.LABOR_PER_MINUTE_PER_PERSON]: {
        usesDuration: true, timeMultiplier: 1, quantityMultiplier: true,
        category: 'Labor', unit: 'min/person'
      },
      [PricingCombination.SERVICE_PER_HOUR_PER_PERSON]: {
        usesDuration: true, timeMultiplier: 60, quantityMultiplier: true,
        category: 'Service', unit: 'hour/person'
      },
      [PricingCombination.SERVICE_PER_MINUTE_PER_PERSON]: {
        usesDuration: true, timeMultiplier: 1, quantityMultiplier: true,
        category: 'Service', unit: 'min/person'
      },

      // === TEAM RATES (tiered pricing) ===
      [PricingCombination.LABOR_PER_HOUR_TEAM_RATE]: {
        usesDuration: true, timeMultiplier: 60, quantityMultiplier: false,
        category: 'Team Labor', unit: 'hour'
      },
      [PricingCombination.LABOR_PER_MINUTE_TEAM_RATE]: {
        usesDuration: true, timeMultiplier: 1, quantityMultiplier: false,
        category: 'Team Labor', unit: 'min'
      },
      [PricingCombination.SERVICE_PER_HOUR_TEAM_RATE]: {
        usesDuration: true, timeMultiplier: 60, quantityMultiplier: false,
        category: 'Team Service', unit: 'hour'
      },
      [PricingCombination.SERVICE_PER_MINUTE_TEAM_RATE]: {
        usesDuration: true, timeMultiplier: 1, quantityMultiplier: false,
        category: 'Team Service', unit: 'min'
      },

      // === SINGLE TIER RATES ===
      [PricingCombination.LABOUR_PER_HOUR]: {
        usesDuration: true, timeMultiplier: 60, quantityMultiplier: false,
        category: 'Labor', unit: 'hour'
      },
      [PricingCombination.LABOUR_PER_MINUTE]: {
        usesDuration: true, timeMultiplier: 1, quantityMultiplier: false,
        category: 'Labor', unit: 'min'
      },
      [PricingCombination.SERVICE_PER_HOUR]: {
        usesDuration: true, timeMultiplier: 60, quantityMultiplier: false,
        category: 'Service', unit: 'hour'
      },
      [PricingCombination.SERVICE_PER_MINUTE]: {
        usesDuration: true, timeMultiplier: 1, quantityMultiplier: false,
        category: 'Service', unit: 'min'
      },

      // === FIXED RATES ===
      [PricingCombination.SERVICE_FIXED_PER_SERVICE]: {
        usesDuration: true, quantityMultiplier: false,
        category: 'Service', unit: 'fixed'
      },
      [PricingCombination.SERVICE_PER_ROOM]: {
        usesDuration: true, quantityMultiplier: false,
        category: 'Service', unit: 'room'
      },
      [PricingCombination.SERVICE_PER_SQM]: {
        usesDuration: true, quantityMultiplier: false,
        category: 'Service', unit: 'sqm'
      },
    };

    return configs[combination];
  }

  /**
   * Log calculation in a consistent format
   */
  private logCalculation(
    config: { category: string; unit: string; timeMultiplier?: number; quantityMultiplier: boolean },
    duration: number,
    tierPrice: number,
    quantity: number,
    finalCost: number
  ) {
    const parts = [];

    if (config.timeMultiplier) {
      const timeUnit = config.timeMultiplier === 60 ? 'hours' : 'minutes';
      const timeValue = config.timeMultiplier === 60 ? (duration / 60).toFixed(1) : duration;
      parts.push(`${timeValue} ${timeUnit}`);
    }

    parts.push(`$${tierPrice}/${config.unit}`);

    if (config.quantityMultiplier) {
      parts.push(`× ${quantity} ${quantity === 1 ? 'person' : 'people'}`);
    }

    console.log(`💰 ${config.category}: ${parts.join(' × ')} = $${finalCost.toFixed(2)}`);
  }

  // Helper methods
  private isTravelComponent(combination: PricingCombination): boolean {
    return combination.startsWith('travel_');
  }

  private findApplicableTier(
    tiers: PricingTier[],
    quantity: number
  ): PricingTier | null {
    return (
      tiers.find(
        (tier) => quantity >= tier.min_quantity && quantity <= tier.max_quantity
      ) || null
    );
  }

  private getEstimatedDuration(
    duration: number | Record<string, number> | null | undefined,
    jobScope?: string
  ): number {
    if (typeof duration === "number") {
      return duration;
    }
    if (typeof duration === "object" && duration !== null) {
      // Use job scope if provided and exists in duration object
      if (jobScope && duration[jobScope] !== undefined) {
        console.log(`⏱️ Using job scope duration: ${jobScope} = ${duration[jobScope]} minutes`);
        return duration[jobScope];
      }

      // Fallback to common job scopes
      return duration.multiple_items || duration.house_move_one_room || duration.house_move_1_bedroom || 60;
    }
    return 60; // Default fallback
  }
}
