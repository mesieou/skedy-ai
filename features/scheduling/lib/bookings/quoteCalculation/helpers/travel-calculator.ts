import type { MobileService } from '../../../../../shared/lib/database/types/service';
import { TravelChargingModel, PricingCombination } from '../../../../../shared/lib/database/types/service';
import type { Business } from '../../../../../shared/lib/database/types/business';
import type { TravelBreakdown, ServiceWithQuantity, BookingAddress, RouteSegment } from '../../../types/booking-calculations';
import { AddressRole } from '../../../types/booking-calculations';
import { isMobileService } from '../../../../../shared/lib/database/types/service';
import { computeDefaultTravelModel } from '../../../../../shared/lib/database/utils/business-utils';
import { GoogleDistanceApiService } from '../../../services/google-distance-api';
import type { DistanceApiRequest } from '../../../types/google-distance-api';
import { DistanceUnits } from '../../../types/google-distance-api';
import { PricingTier } from '../../../../../shared/lib/database/types/service';

export class TravelCalculator {
  private googleDistanceApi: GoogleDistanceApiService;

  constructor() {
    this.googleDistanceApi = new GoogleDistanceApiService();
  }

  /**
   * Calculate travel costs for the entire booking (shared across all services)
   */
  async calculateBookingTravel(
    services: ServiceWithQuantity[],
    addresses: BookingAddress[],
    business: Business
  ): Promise<TravelBreakdown> {
    // Filter to only mobile services (type-safe filtering)
    const mobileServices = services.filter((s) => isMobileService(s.service));

    // If no mobile services, return empty travel breakdown
    if (mobileServices.length === 0) {
      return {
        total_distance_km: 0,
        total_travel_time_mins: 0,
        total_travel_cost: 0,
        route_segments: [],
        free_travel_applied: false,
        free_travel_distance_km: 0,
      };
    }

    // Use business default travel model (with optional service override)
    const travelModel = this.getBookingTravelModel(
      mobileServices[0].service as MobileService,
      business
    );

    // Step 1: Determine which route segments to charge for the booking
    const chargeableSegments = this.determineChargeableSegments(
      addresses,
      travelModel
    );

    // Step 2: Get distances and durations from Google Distance API (batch processing)
    const distanceRequests: DistanceApiRequest[] = chargeableSegments.map(
      (segment) => ({
        origin: segment.from_address,
        destination: segment.to_address,
        units: DistanceUnits.METRIC,
      })
    );

    // Single API call for all booking segments using Distance Matrix
    console.log(`🌍 Making Google Distance API call for ${distanceRequests.length} segments:`, distanceRequests);
    const distanceResults = await this.googleDistanceApi.getBatchDistances(
      distanceRequests
    );
    console.log(`🌍 Google API results:`, distanceResults);

    const route_segments: RouteSegment[] = [];
    let total_distance_km = 0;
    let total_travel_time_mins = 0;

    chargeableSegments.forEach((segment, index) => {
      const distance_data = distanceResults[index];

      // Check if Google API failed or returned invalid data
      if (distance_data.status !== 'OK') {
        throw new Error(`Google Distance API failed for route ${segment.from_address} → ${segment.to_address}: ${distance_data.error_message || distance_data.status}`);
      }

      // Check if distance/duration are zero (suspicious for real addresses)
      if (distance_data.distance_km === 0 && distance_data.duration_mins === 0) {
        console.warn(`⚠️ Zero distance/duration for ${segment.from_address} → ${segment.to_address}`);
        // This might be valid (same location) or might indicate an API issue
      }

      console.log(`🛣️ Route segment ${index}: ${segment.from_address} → ${segment.to_address} = ${distance_data.distance_km}km, ${distance_data.duration_mins}min`);

      const route_segment: RouteSegment = {
        from_address: segment.from_address,
        to_address: segment.to_address,
        distance_km: distance_data.distance_km,
        duration_mins: distance_data.duration_mins,
        cost: 0, // Will be calculated per service component
        is_chargeable: segment.is_chargeable,
        service_id: segment.service_id,
        segment_type: "customer_to_customer",
      };

      route_segments.push(route_segment);

      if (segment.is_chargeable) {
        total_distance_km += distance_data.distance_km;
        total_travel_time_mins += distance_data.duration_mins;
      }
    });

    // Calculate booking-level travel cost using mobile services' travel pricing components
    const total_travel_cost = await this.calculateBookingTravelCost(
      mobileServices,
      total_distance_km,
      total_travel_time_mins
    );

    return {
      total_distance_km,
      total_travel_time_mins,
      total_travel_cost: Math.round(total_travel_cost),
      route_segments,
      free_travel_applied: false,
      free_travel_distance_km: 0,
    };
  }

  /**
   * Get the travel model for the booking using computed business default + optional service override
   */
  private getBookingTravelModel(
    mobileService: MobileService,
    business: Business
  ): TravelChargingModel {
    // Service override takes precedence, otherwise compute from business settings
    if (mobileService.travel_charging_model) {
      return mobileService.travel_charging_model;
    }

    // Compute default based on business category and mobile service offering
    const computedModel = computeDefaultTravelModel(
      business.business_category,
      business.offers_mobile_services
    );

    if (!computedModel) {
      throw new Error(
        `Business offers mobile services but no travel model could be computed for category: ${business.business_category}`
      );
    }

    return computedModel;
  }

  /**
   * Calculate travel cost ONCE for the entire booking using the first mobile service's travel pricing
   */
  private async calculateBookingTravelCost(
    mobileServices: ServiceWithQuantity[],
    total_distance_km: number,
    total_travel_time_mins: number
  ): Promise<number> {
    // If no mobile services, no travel cost
    if (mobileServices.length === 0) {
      return 0;
    }

    // Use the FIRST mobile service's travel pricing component for the entire booking
    const firstMobileService = mobileServices[0];
    const { service } = firstMobileService;

    if (!service.pricing_config) {
      return 0;
    }

    // Find the travel pricing component from the first service
    for (const component of service.pricing_config.components) {
      if (this.isTravelComponent(component.pricing_combination)) {
        const tier = this.findApplicableTier(
          component.tiers,
          firstMobileService.quantity
        );
        if (!tier) {
          continue;
        }

        console.log(`💰 Travel cost calculation: ${component.pricing_combination}, time: ${total_travel_time_mins}min, price: $${tier.price}, quantity: ${firstMobileService.quantity}`);

        switch (component.pricing_combination) {
          // === PER PERSON/VEHICLE TRAVEL (linear scaling) ===
          case PricingCombination.TRAVEL_PER_KM_PER_PERSON:
          case PricingCombination.TRAVEL_PER_KM_PER_VEHICLE:
            return total_distance_km * tier.price * firstMobileService.quantity;
          case PricingCombination.TRAVEL_PER_MINUTE_PER_PERSON:
          case PricingCombination.TRAVEL_PER_MINUTE_PER_VEHICLE:
            return total_travel_time_mins * tier.price * firstMobileService.quantity;
          case PricingCombination.TRAVEL_PER_HOUR_PER_PERSON:
          case PricingCombination.TRAVEL_PER_HOUR_PER_VEHICLE:
            return (total_travel_time_mins / 60) * tier.price * firstMobileService.quantity;

          // === TEAM TRAVEL RATES ===
          case PricingCombination.TRAVEL_PER_KM_TEAM_RATE:
            return total_distance_km * tier.price;
          case PricingCombination.TRAVEL_PER_MINUTE_TEAM_RATE:
            return total_travel_time_mins * tier.price;
          case PricingCombination.TRAVEL_PER_HOUR_TEAM_RATE:
            return (total_travel_time_mins / 60) * tier.price;

          // === SINGLE TIER TRAVEL ===
          case PricingCombination.TRAVEL_PER_KM:
            return total_distance_km * tier.price;
          case PricingCombination.TRAVEL_PER_MINUTE:
            return total_travel_time_mins * tier.price;
          case PricingCombination.TRAVEL_PER_HOUR:
            return (total_travel_time_mins / 60) * tier.price;
        }
      }
    }

    return 0; // No travel component found
  }

  private determineChargeableSegments(
    addresses: BookingAddress[],
    model: TravelChargingModel
  ): Array<{
    from_address: string;
    to_address: string;
    is_chargeable: boolean;
    service_id?: string;
  }> {
    const segments: Array<{
      from_address: string;
      to_address: string;
      is_chargeable: boolean;
      service_id?: string;
    }> = [];

    // Sort addresses by sequence_order
    const sortedAddresses = addresses.sort(
      (a, b) => a.sequence_order - b.sequence_order
    );

    switch (model) {
      case TravelChargingModel.BETWEEN_CUSTOMER_LOCATIONS:
        // Only charge between customer addresses (skip business base)
        const customerAddresses = sortedAddresses.filter(
          (a) => a.role !== AddressRole.BUSINESS_BASE
        );
        for (let i = 0; i < customerAddresses.length - 1; i++) {
          segments.push({
            from_address: `${customerAddresses[i].address.address_line_1}, ${customerAddresses[i].address.city}`,
            to_address: `${customerAddresses[i + 1].address.address_line_1}, ${
              customerAddresses[i + 1].address.city
            }`,
            is_chargeable: true,
            service_id: customerAddresses[i].service_id,
          });
        }
        break;

      case TravelChargingModel.FROM_BASE_TO_CUSTOMERS:
        // Include base to first customer, then customer-to-customer
        for (let i = 0; i < sortedAddresses.length - 1; i++) {
          const isFirstSegment = i === 0;
          const fromBase =
            sortedAddresses[i].role === AddressRole.BUSINESS_BASE;

          segments.push({
            from_address: `${sortedAddresses[i].address.address_line_1}, ${sortedAddresses[i].address.city}`,
            to_address: `${sortedAddresses[i + 1].address.address_line_1}, ${
              sortedAddresses[i + 1].address.city
            }`,
            is_chargeable: isFirstSegment || !fromBase,
            service_id: sortedAddresses[i].service_id,
          });
        }
        break;

      case TravelChargingModel.CUSTOMERS_AND_BACK_TO_BASE:
        // Charge between customers + last customer back to base
        const allAddresses = sortedAddresses;
        for (let i = 0; i < allAddresses.length - 1; i++) {
          const isFromBase = allAddresses[i].role === AddressRole.BUSINESS_BASE;

          segments.push({
            from_address: `${allAddresses[i].address.address_line_1}, ${allAddresses[i].address.city}`,
            to_address: `${allAddresses[i + 1].address.address_line_1}, ${
              allAddresses[i + 1].address.city
            }`,
            is_chargeable: !isFromBase, // Don't charge from base, but charge back to base
            service_id: allAddresses[i].service_id,
          });
        }
        break;

      case TravelChargingModel.FULL_ROUTE:
        // Charge for everything including return to base
        for (let i = 0; i < sortedAddresses.length - 1; i++) {
          segments.push({
            from_address: `${sortedAddresses[i].address.address_line_1}, ${sortedAddresses[i].address.city}`,
            to_address: `${sortedAddresses[i + 1].address.address_line_1}, ${
              sortedAddresses[i + 1].address.city
            }`,
            is_chargeable: true,
            service_id: sortedAddresses[i].service_id,
          });
        }
        break;

      case TravelChargingModel.BETWEEN_CUSTOMERS_AND_BACK_TO_BASE:
        // Charge between customer locations and return to base (skip initial base to customer)
        for (let i = 0; i < sortedAddresses.length - 1; i++) {
          const isFromBase = sortedAddresses[i].role === AddressRole.BUSINESS_BASE;
          const isToBase = sortedAddresses[i + 1].role === AddressRole.BUSINESS_BASE;
          const isBetweenCustomers = !isFromBase && !isToBase;

          segments.push({
            from_address: `${sortedAddresses[i].address.address_line_1}, ${sortedAddresses[i].address.city}`,
            to_address: `${sortedAddresses[i + 1].address.address_line_1}, ${
              sortedAddresses[i + 1].address.city
            }`,
            is_chargeable: isBetweenCustomers || isToBase, // Charge between customers or back to base
            service_id: sortedAddresses[i].service_id,
          });
        }
        break;

      case TravelChargingModel.FROM_BASE_AND_BETWEEN_CUSTOMERS:
        // Charge from base to customers + between customers (skip return to base)
        for (let i = 0; i < sortedAddresses.length - 1; i++) {
          const isToBase = sortedAddresses[i + 1].role === AddressRole.BUSINESS_BASE;

          segments.push({
            from_address: `${sortedAddresses[i].address.address_line_1}, ${sortedAddresses[i].address.city}`,
            to_address: `${sortedAddresses[i + 1].address.address_line_1}, ${
              sortedAddresses[i + 1].address.city
            }`,
            is_chargeable: !isToBase, // Charge everything except return to base
            service_id: sortedAddresses[i].service_id,
          });
        }
        break;
    }

    return segments;
  }

  // Helper methods
  private isTravelComponent(combination: PricingCombination): boolean {
    return combination.startsWith('travel_');
  }

  private findApplicableTier(tiers: PricingTier[], quantity: number): PricingTier | null {
    return (
      tiers.find(
        (tier) => quantity >= tier.min_quantity && quantity <= tier.max_quantity
      ) || null
    );
  }
}
