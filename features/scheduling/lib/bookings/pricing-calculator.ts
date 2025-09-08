import {
  PricingCombination,
  TravelChargingModel,
  isMobileService,
  type MobileService,
} from "../../../shared/lib/database/types/service";
import { AddressRole } from "../types/booking-calculations";
import type {
  BookingCalculationInput,
  BookingCalculationResult,
  ServiceWithQuantity,
  ServiceBreakdown,
  TravelBreakdown,
  RouteSegment,
  BookingAddress,
  BusinessFeeBreakdown,
} from "../types/booking-calculations";
import type { Business } from "../../../shared/lib/database/types/business";
import { DepositType } from "../../../shared/lib/database/types/business";
import { computeDefaultTravelModel } from "../../../shared/lib/database/utils/business-utils";
import type {
  PricingComponent,
  PricingTier,
} from "../../../shared/lib/database/types/service";
import { GoogleDistanceApiService } from "../services/google-distance-api";
import type { DistanceApiRequest } from "../types/google-distance-api";
import { DistanceUnits } from "../types/google-distance-api";
import { DateUtils } from "../../../shared/utils/date-utils";

export class BookingCalculator {
  private googleDistanceApi: GoogleDistanceApiService;

  constructor() {
    this.googleDistanceApi = new GoogleDistanceApiService();
  }

  /**
   * Main entry point for booking calculations
   */
  async calculateBooking(
    input: BookingCalculationInput,
    jobScope?: string
  ): Promise<BookingCalculationResult> {
    try {
      // Step 1: Calculate shared travel for the entire booking
      const travel_breakdown = await this.calculateBookingTravel(
        input.services,
        input.addresses,
        input.business
      );

      // Step 2: Calculate each service using shared travel data
      const service_breakdowns: ServiceBreakdown[] = [];
      let total_estimate_amount = 0;
      let total_estimate_time_in_minutes = 0;

      for (const serviceItem of input.services) {
        const breakdown = await this.calculateServiceCost(serviceItem, jobScope);

        service_breakdowns.push(breakdown);
        total_estimate_amount += breakdown.total_cost;
        total_estimate_time_in_minutes += breakdown.estimated_duration_mins;
      }

      // Step 3: Add shared travel time and cost (once for the entire booking)
      total_estimate_time_in_minutes += travel_breakdown.total_travel_time_mins;
      total_estimate_amount += travel_breakdown.total_travel_cost;

      // Step 4: Calculate business fees
      const business_fees = this.calculateBusinessFees(
        total_estimate_amount,
        input.business
      );

      // Ensure fees are numbers, not null/undefined (prevents NaN)
      const gstAmount = business_fees.gst_amount || 0;
      const platformFee = business_fees.platform_fee || 0;
      const processingFee = business_fees.payment_processing_fee || 0;

      total_estimate_amount += gstAmount + platformFee + processingFee;

      // Step 5: Apply minimum charge
      const minimum_charge_applied =
        total_estimate_amount < input.business.minimum_charge;
      if (minimum_charge_applied) {
        total_estimate_amount = input.business.minimum_charge;
      }

      // Step 6: Calculate deposit
      const deposit_amount = this.calculateDeposit(
        total_estimate_amount,
        input.business
      );
      const remaining_balance = total_estimate_amount; // Full amount for new bookings
      const deposit_paid = false; // Always false for new bookings

      return {
        total_estimate_amount,
        total_estimate_time_in_minutes,
        minimum_charge_applied,
        deposit_amount,
        remaining_balance,
        deposit_paid,
        price_breakdown: {
          service_breakdowns,
          travel_breakdown,
          business_fees,
        },
      };
    } catch (error) {
      throw new Error(
        `Booking calculation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Calculate travel costs for the entire booking (shared across all services)
   */
  private async calculateBookingTravel(
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
      total_travel_cost,
      route_segments,
      free_travel_applied: false,
      free_travel_distance_km: 0,
    };
  }

  private async calculateServiceCost(
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
      service_cost,
      setup_cost: 0,
      total_cost: service_cost, // No travel cost added here
      estimated_duration_mins,
      component_breakdowns: [],
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
          case PricingCombination.TRAVEL_PER_KM:
          case PricingCombination.TRAVEL_PER_KM_PER_PERSON:
          case PricingCombination.TRAVEL_PER_KM_PER_VEHICLE:
            // Price is the total rate for this tier/quantity
            return total_distance_km * tier.price;
          case PricingCombination.TRAVEL_PER_MINUTE:
          case PricingCombination.TRAVEL_PER_MINUTE_PER_PERSON:
          case PricingCombination.TRAVEL_PER_MINUTE_PER_VEHICLE:
            // Price is the total rate for this tier/quantity
            return total_travel_time_mins * tier.price;
          case PricingCombination.TRAVEL_PER_HOUR_PER_PERSON:
          case PricingCombination.TRAVEL_PER_HOUR_PER_VEHICLE:
            // Tier price is already the total rate for this quantity/tier
            return (total_travel_time_mins / 60) * tier.price;
        }
      }
    }

    return 0; // No travel component found
  }

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

    let cost = 0;
    let duration_mins = 0;

    switch (component.pricing_combination) {
      case PricingCombination.LABOR_PER_HOUR_PER_PERSON:
        // Calculate based on estimated duration - tier price is total rate for this quantity
        duration_mins = this.getEstimatedDuration(tier.duration_estimate_mins, jobScope);
        cost = (duration_mins / 60) * tier.price;
        console.log(`💰 Labor calculation: ${duration_mins}min ÷ 60 × $${tier.price} = $${cost}`);
        break;

      case PricingCombination.LABOR_PER_MINUTE_PER_PERSON:
        // Price is total rate per minute for this tier/quantity
        duration_mins = this.getEstimatedDuration(tier.duration_estimate_mins, jobScope);
        cost = duration_mins * tier.price;
        console.log(`💰 Labor calculation: ${duration_mins}min × $${tier.price} = $${cost}`);
        break;

      case PricingCombination.LABOR_PER_HOUR_PER_ROOM:
        // Price is total rate per hour for this number of rooms
        duration_mins = this.getEstimatedDuration(tier.duration_estimate_mins, jobScope);
        cost = (duration_mins / 60) * tier.price;
        console.log(`💰 Labor calculation: ${duration_mins}min ÷ 60 × $${tier.price} = $${cost}`);
        break;

      case PricingCombination.LABOUR_PER_HOUR:
        // Calculate based on estimated duration - simple hourly rate
        duration_mins = this.getEstimatedDuration(tier.duration_estimate_mins, jobScope);
        cost = (duration_mins / 60) * tier.price;
        console.log(`💰 Labor calculation: ${duration_mins}min ÷ 60 × $${tier.price} = $${cost}`);
        break;

      case PricingCombination.LABOUR_PER_MINUTE:
        // Simple per minute rate
        duration_mins = this.getEstimatedDuration(tier.duration_estimate_mins, jobScope);
        cost = duration_mins * tier.price;
        console.log(`💰 Labor calculation: ${duration_mins}min × $${tier.price} = $${cost}`);
        break;

      case PricingCombination.SERVICE_PER_HOUR_PER_PERSON:
        // Price is total rate per hour for this tier/quantity
        duration_mins = this.getEstimatedDuration(tier.duration_estimate_mins, jobScope);
        cost = (duration_mins / 60) * tier.price;
        console.log(`💰 Service calculation: ${duration_mins}min ÷ 60 × $${tier.price} = $${cost}`);
        break;

      case PricingCombination.SERVICE_PER_MINUTE_PER_PERSON:
        // Price is total rate per minute for this tier/quantity
        duration_mins = this.getEstimatedDuration(tier.duration_estimate_mins, jobScope);
        cost = duration_mins * tier.price;
        console.log(`💰 Service calculation: ${duration_mins}min × $${tier.price} = $${cost}`);
        break;

      case PricingCombination.SERVICE_PER_ROOM:
        // Price is total rate per room for this tier
        cost = tier.price;
        duration_mins = this.getEstimatedDuration(tier.duration_estimate_mins, jobScope);
        console.log(`💰 Service calculation: $${tier.price} per room`);
        break;

      case PricingCombination.SERVICE_PER_SQM:
        // Price is rate per square meter
        cost = tier.price;
        duration_mins = this.getEstimatedDuration(tier.duration_estimate_mins, jobScope);
        console.log(`💰 Service calculation: $${tier.price} per sqm`);
        break;

      case PricingCombination.SERVICE_FIXED_PER_SERVICE:
        // Fixed price regardless of other factors
        cost = tier.price;
        duration_mins = this.getEstimatedDuration(tier.duration_estimate_mins, jobScope);
        console.log(`💰 Service calculation: Fixed $${tier.price}`);
        break;

      default:
        // Travel components should not reach here as they're filtered out
        throw new Error(
          `Unsupported pricing combination: ${component.pricing_combination}`
        );
    }

    return { cost, duration_mins };
  }

  private calculateBusinessFees(
    amount: number,
    business: Business
  ): BusinessFeeBreakdown {
    // Calculate GST if business charges it
    const gst_rate = business.charges_gst ? business.gst_rate || 0 : 0;
    const gst_amount =
      business.charges_gst && business.gst_rate
        ? amount * (business.gst_rate / 100)
        : 0;

    // Calculate payment processing fee only if deposit is required
    const payment_processing_fee_percentage =
      business.payment_processing_fee_percentage || 0;
    const payment_processing_fee = business.charges_deposit
      ? amount * (business.payment_processing_fee_percentage / 100)
      : 0;

    // Calculate platform fee using business configuration
    const platform_fee_percentage =
      business.booking_platform_fee_percentage || 0;
    const platform_fee =
      amount * (business.booking_platform_fee_percentage / 100);

    return {
      gst_amount,
      gst_rate,
      platform_fee,
      platform_fee_amount: platform_fee, // Alias for amount
      platform_fee_percentage,
      payment_processing_fee,
      payment_processing_fee_amount: payment_processing_fee, // Alias for amount
      payment_processing_fee_percentage,
      other_fees: [],
    };
  }

  private calculateDeposit(total_amount: number, business: Business): number {
    console.log('🔍 [Deposit Debug] Business deposit config:', {
      charges_deposit: business.charges_deposit,
      deposit_type: business.deposit_type,
      deposit_fixed_amount: business.deposit_fixed_amount,
      deposit_percentage: business.deposit_percentage
    });

    if (!business.charges_deposit) {
      console.log('❌ [Deposit] Business does not charge deposits');
      return 0;
    }

    if (
      business.deposit_type === DepositType.FIXED &&
      business.deposit_fixed_amount
    ) {
      console.log(`✅ [Deposit] Fixed deposit: $${business.deposit_fixed_amount}`);
      return business.deposit_fixed_amount;
    }

    if (
      business.deposit_type === DepositType.PERCENTAGE &&
      business.deposit_percentage
    ) {
      const deposit = total_amount * (business.deposit_percentage / 100);
      console.log(`✅ [Deposit] Percentage deposit: ${business.deposit_percentage}% of $${total_amount} = $${deposit}`);
      return deposit;
    }

    console.log('❌ [Deposit] No valid deposit configuration found');
    return 0;
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
    return [
      PricingCombination.TRAVEL_PER_KM,
      PricingCombination.TRAVEL_PER_MINUTE,
      PricingCombination.TRAVEL_PER_KM_PER_PERSON,
      PricingCombination.TRAVEL_PER_MINUTE_PER_PERSON,
      PricingCombination.TRAVEL_PER_HOUR_PER_PERSON,
      PricingCombination.TRAVEL_PER_KM_PER_VEHICLE,
      PricingCombination.TRAVEL_PER_MINUTE_PER_VEHICLE,
      PricingCombination.TRAVEL_PER_HOUR_PER_VEHICLE,
    ].includes(combination);
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

  private getServiceTravelDistance(
    serviceAddresses: BookingAddress[],
    travel_breakdown: TravelBreakdown
  ): number {
    return travel_breakdown.route_segments
      .filter((segment) =>
        serviceAddresses.some(
          (addr) =>
            `${addr.address.address_line_1}, ${addr.address.city}` ===
              segment.from_address ||
            `${addr.address.address_line_1}, ${addr.address.city}` ===
              segment.to_address
        )
      )
      .reduce((total, segment) => total + segment.distance_km, 0);
  }

  private getServiceTravelTime(
    serviceAddresses: BookingAddress[],
    travel_breakdown: TravelBreakdown
  ): number {
    return travel_breakdown.route_segments
      .filter((segment) =>
        serviceAddresses.some(
          (addr) =>
            `${addr.address.address_line_1}, ${addr.address.city}` ===
              segment.from_address ||
            `${addr.address.address_line_1}, ${addr.address.city}` ===
              segment.to_address
        )
      )
      .reduce((total, segment) => total + segment.duration_mins, 0);
  }

  // ============================================================================
  // BOOKING TIMESTAMP UTILITIES
  // ============================================================================

  /**
   * Calculate booking timestamps in UTC from date, time, and duration
   */
  static calculateBookingTimestamps(
    dateStr: string,
    timeStr: string,
    durationMinutes: number,
    businessTimezone: string
  ): { start_at: string; end_at: string } {
    // Convert local business time to UTC (timeStr is in business timezone)
    const start_at = DateUtils.convertBusinessTimeToUTC(dateStr, timeStr + ':00', businessTimezone);

    // Calculate end timestamp using DateUtils
    const end_at = DateUtils.calculateEndTimestamp(start_at, durationMinutes);

    return { start_at, end_at };
  }
}
