/**
 * Service Requirements Generator
 *
 * Generates AI function requirements when creating/updating services
 * Used by service repository to populate ai_function_requirements column
 */

import type { Service } from '../types/service';
import { TravelChargingModel, PricingCombination, isMobileService } from '../types/service';

export class ServiceRequirementsGenerator {

  /**
   * Generate requirements and job scope options for a service (to store in database)
   */
  static generateRequirements(service: Service): {
    requirements: string[];
    jobScopeOptions: string[] | null;
  } {
    const requirements: string[] = [];

    // Add address requirements based on service type
    if (isMobileService(service)) {
      const addressReqs = this.getAddressRequirements(service.travel_charging_model!);
      requirements.push(...addressReqs);
    }

    // Add quantity requirements based on pricing (deduplicated)
    const quantityRequirements: string[] = [];
    service.pricing_config!.components.forEach(component => {
      const quantityReq = this.getQuantityRequirement(component.pricing_combination);
      if (quantityReq) {
        quantityRequirements.push(quantityReq);
      }
    });

    // Deduplicate quantity requirements
    const uniqueQuantityReqs = [...new Set(quantityRequirements)];
    requirements.push(...uniqueQuantityReqs);

    // Extract job scope options from duration objects
    const jobScopeOptions = this.extractJobScopeOptions(service);
    if (jobScopeOptions && jobScopeOptions.length > 0) {
      requirements.push('job_scope');
    }

    return {
      requirements,
      jobScopeOptions
    };
  }

  /**
   * Get address requirements based on travel model
   */
  private static getAddressRequirements(
    travelModel: TravelChargingModel
  ): string[] {
    // Default travel model if not specified
    const model = travelModel;

    switch (model) {
      case TravelChargingModel.BETWEEN_CUSTOMER_LOCATIONS:
      case TravelChargingModel.FULL_ROUTE:
      case TravelChargingModel.BETWEEN_CUSTOMERS_AND_BACK_TO_BASE:
      case TravelChargingModel.FROM_BASE_AND_BETWEEN_CUSTOMERS:
      case TravelChargingModel.FROM_BASE_TO_CUSTOMERS_AND_BACK_TO_BASE:  // MWAV model
        return ['pickup_addresses', 'dropoff_addresses'];  // Multiple pickups/dropoffs

      case TravelChargingModel.FROM_BASE_TO_CUSTOMERS:
      case TravelChargingModel.CUSTOMERS_AND_BACK_TO_BASE:
        return ['customer_address'];  // Single customer location (we handle base) // Multiple service locations possible
    }
  }

  /**
   * Extract job scope options from service duration objects
   */
  private static extractJobScopeOptions(service: Service): string[] | null {
    const allJobScopes = new Set<string>();

    service.pricing_config!.components.forEach(component => {
      component.tiers?.forEach(tier => {
        if (tier.duration_estimate_mins && typeof tier.duration_estimate_mins === "object") {
          // Extract keys from duration object (these are the job scope options)
          Object.keys(tier.duration_estimate_mins).forEach(jobScope => {
            allJobScopes.add(jobScope);
          });
        }
      });
    });

    return allJobScopes.size > 0 ? Array.from(allJobScopes) : null;
  }

  /**
   * Get quantity requirement based on pricing combination
   */
  private static getQuantityRequirement(pricingCombination: PricingCombination): string | null {
    switch (pricingCombination) {
      // === PER PERSON RATES (linear scaling) ===
      case PricingCombination.LABOR_PER_HOUR_PER_PERSON:
      case PricingCombination.LABOR_PER_MINUTE_PER_PERSON:
      case PricingCombination.SERVICE_PER_HOUR_PER_PERSON:
      case PricingCombination.SERVICE_PER_MINUTE_PER_PERSON:
      case PricingCombination.TRAVEL_PER_KM_PER_PERSON:
      case PricingCombination.TRAVEL_PER_MINUTE_PER_PERSON:
      case PricingCombination.TRAVEL_PER_HOUR_PER_PERSON:
        return 'number_of_people';

      // === TEAM RATES (tiered pricing) ===
      case PricingCombination.LABOR_PER_HOUR_TEAM_RATE:
      case PricingCombination.LABOR_PER_MINUTE_TEAM_RATE:
      case PricingCombination.SERVICE_PER_HOUR_TEAM_RATE:
      case PricingCombination.SERVICE_PER_MINUTE_TEAM_RATE:
      case PricingCombination.TRAVEL_PER_KM_TEAM_RATE:
      case PricingCombination.TRAVEL_PER_MINUTE_TEAM_RATE:
      case PricingCombination.TRAVEL_PER_HOUR_TEAM_RATE:
        return 'number_of_people'; // Still need to know team size for tier selection

      // === VEHICLE-BASED ===
      case PricingCombination.TRAVEL_PER_KM_PER_VEHICLE:
      case PricingCombination.TRAVEL_PER_MINUTE_PER_VEHICLE:
      case PricingCombination.TRAVEL_PER_HOUR_PER_VEHICLE:
        return 'number_of_vehicles';

      // === ROOM-BASED ===
      case PricingCombination.SERVICE_PER_ROOM:
        return 'number_of_rooms';

      // === AREA-BASED ===
      case PricingCombination.SERVICE_PER_SQM:
        return 'square_meters';

      // === SINGLE TIER - no quantity needed ===
      case PricingCombination.SERVICE_FIXED_PER_SERVICE:
      case PricingCombination.SERVICE_PER_MINUTE:
      case PricingCombination.SERVICE_PER_HOUR:
      case PricingCombination.TRAVEL_PER_KM:
      case PricingCombination.TRAVEL_PER_MINUTE:
      case PricingCombination.TRAVEL_PER_HOUR:
      case PricingCombination.LABOUR_PER_HOUR:
      case PricingCombination.LABOUR_PER_MINUTE:
        return null;

      default:
        return null;
    }
  }
}
