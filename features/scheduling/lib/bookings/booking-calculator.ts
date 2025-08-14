import { PricingCombination } from '../../../shared/lib/database/types/service';
import { AddressRole } from '../types/booking-calculations';
import { TravelChargingModel } from '../../../shared/lib/database/types/service';
import type {
  BookingCalculationInput,
  BookingCalculationResult,
  ServiceWithQuantity,
  ServiceBreakdown,
  TravelBreakdown,
  RouteSegment,
  BookingAddress,
  BusinessFeeBreakdown
} from '../types/booking-calculations';
import type { Business } from '../../../shared/lib/database/types/business';
import { DepositType } from '../../../shared/lib/database/types/business';
import type { PricingComponent, PricingTier } from '../../../shared/lib/database/types/service';
import { GoogleDistanceApiService } from '../services/google-distance-api';
import type { DistanceApiRequest } from '../types/google-distance-api';
import { DistanceUnits } from '../types/google-distance-api';

export class BookingCalculator {
  private googleDistanceApi: GoogleDistanceApiService;

  constructor() {
    this.googleDistanceApi = new GoogleDistanceApiService();
  }
  
  /**
   * Main entry point for booking calculations
   */
  async calculateBooking(input: BookingCalculationInput): Promise<BookingCalculationResult> {
    
    try {
      // Step 1: Calculate travel routes and distances for each service
      const travel_breakdown = await this.calculateTravelCosts(input.services, input.addresses);
      
      // Step 2: Calculate each service
      const service_breakdowns: ServiceBreakdown[] = [];
      let total_estimate_amount = 0;
      let total_estimate_time_in_minutes = 0;
      
      for (const serviceItem of input.services) {
        const breakdown = await this.calculateServiceCost(
          serviceItem, 
          input.business,
          travel_breakdown
        );
        
        service_breakdowns.push(breakdown);
        total_estimate_amount += breakdown.total_cost;
        total_estimate_time_in_minutes += breakdown.estimated_duration_mins;
      }
      
      // Step 3: Add travel time
      total_estimate_time_in_minutes += travel_breakdown.total_travel_time_mins;
      
      // Step 4: Calculate business fees
      const business_fees = this.calculateBusinessFees(total_estimate_amount, input.business);
      total_estimate_amount += business_fees.gst_amount + business_fees.platform_fee + business_fees.payment_processing_fee;
      
      // Step 5: Apply minimum charge
      const minimum_charge_applied = total_estimate_amount < input.business.minimum_charge;
      if (minimum_charge_applied) {
        total_estimate_amount = input.business.minimum_charge;
      }
      
      // Step 6: Apply surge pricing if enabled
      let surge_pricing_applied = false;
      if (input.calculationOptions.apply_surge_pricing && input.calculationOptions.surge_multiplier) {
        total_estimate_amount *= input.calculationOptions.surge_multiplier;
        surge_pricing_applied = true;
      }
      
      // Step 7: Calculate deposit
      const deposit_amount = this.calculateDeposit(total_estimate_amount, input.business);
      const remaining_balance = total_estimate_amount; // Full amount for new bookings
      const deposit_paid = false; // Always false for new bookings
      
      return {
        total_estimate_amount,
        total_estimate_time_in_minutes,
        minimum_charge_applied,
        surge_pricing_applied,
        deposit_amount,
        remaining_balance,
        deposit_paid,
        price_breakdown: {
          service_breakdowns,
          travel_breakdown,
          business_fees
        }
      };
      
    } catch (error) {
      throw new Error(`Booking calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async calculateTravelCosts(
    services: ServiceWithQuantity[],
    addresses: BookingAddress[]
  ): Promise<TravelBreakdown> {
    // Use the service's travel charging model (get from first mobile service)
    const mobileService = services.find(s => s.service.travel_charging_model !== null);
    const travelModel = mobileService?.service.travel_charging_model || TravelChargingModel.BETWEEN_CUSTOMER_LOCATIONS;
    
    // Step 1: Determine which route segments to charge for
    const chargeableSegments = this.determineChargeableSegments(addresses, travelModel);
    
    // Step 2: Get distances and durations from Google Distance API (batch processing)
    const distanceRequests: DistanceApiRequest[] = chargeableSegments.map(segment => ({
      origin: segment.from_address,
      destination: segment.to_address,
      units: DistanceUnits.METRIC
    }));
    
    // Single API call for all segments using Distance Matrix
    const distanceResults = await this.googleDistanceApi.getBatchDistances(distanceRequests);
    
    const route_segments: RouteSegment[] = [];
    let total_distance_km = 0;
    let total_travel_time_mins = 0;
    const total_travel_cost = 0; // Calculated later per service component
    
    chargeableSegments.forEach((segment, index) => {
      const distance_data = distanceResults[index];
      
      const route_segment: RouteSegment = {
        from_address: segment.from_address,
        to_address: segment.to_address,
        distance_km: distance_data.distance_km,
        duration_mins: distance_data.duration_mins,
        cost: 0, // Will be calculated per service component
        is_chargeable: segment.is_chargeable,
        service_id: segment.service_id,
        segment_type: 'customer_to_customer'
      };
      
      route_segments.push(route_segment);
      
      if (segment.is_chargeable) {
        total_distance_km += distance_data.distance_km;
        total_travel_time_mins += distance_data.duration_mins;
      }
    });
    
    return {
      total_distance_km,
      total_travel_time_mins,
      total_travel_cost,
      route_segments,
      free_travel_applied: false,
      free_travel_distance_km: 0
    };
  }

  private async calculateServiceCost(
    serviceItem: ServiceWithQuantity, 
    business: Business,
    travel_breakdown: TravelBreakdown
  ): Promise<ServiceBreakdown> {
    
    const { service, quantity } = serviceItem;
    let base_cost = 0;
    let travel_cost = 0;
    let estimated_duration_mins = 0;
    
    if (!service.pricing_config) {
      throw new Error(`Service ${service.name} has no pricing configuration`);
    }
    
    // Loop through pricing components
    for (const component of service.pricing_config.components) {
      const componentCost = await this.calculateComponentCost(
        component, 
        quantity, 
        serviceItem.serviceAddresses,
        travel_breakdown
      );
      
      // Determine if this is travel or service cost
      if (this.isTravelComponent(component.pricing_combination)) {
        travel_cost += componentCost.cost;
      } else {
        base_cost += componentCost.cost;
      }
      
      estimated_duration_mins += componentCost.duration_mins;
    }
    
    return {
      service_id: service.id,
      service_name: service.name,
      quantity,
      base_cost,
      travel_cost,
      setup_cost: 0,
      surge_cost: 0,
      total_cost: base_cost + travel_cost,
      estimated_duration_mins,
      component_breakdowns: []
    };
  }

  private async calculateComponentCost(
    component: PricingComponent,
    quantity: number,
    serviceAddresses: BookingAddress[],
    travel_breakdown: TravelBreakdown
  ): Promise<{cost: number, duration_mins: number}> {
    
    // Find the appropriate tier based on quantity
    const tier = this.findApplicableTier(component.tiers, quantity);
    if (!tier) {
      throw new Error(`No pricing tier found for quantity ${quantity} in component ${component.name}`);
    }
    
    let cost = 0;
    let duration_mins = 0;
    
    switch (component.pricing_combination) {
      case PricingCombination.LABOR_PER_HOUR_PER_PERSON:
        // Calculate based on estimated duration and people
        duration_mins = this.getEstimatedDuration(tier.duration_estimate_mins);
        cost = (duration_mins / 60) * tier.price * quantity;
        break;
        
      case PricingCombination.TRAVEL_PER_KM:
        // Use Google Distance API results
        const distance = this.getServiceTravelDistance(serviceAddresses, travel_breakdown);
        cost = distance * tier.price;
        duration_mins = this.getServiceTravelTime(serviceAddresses, travel_breakdown);
        break;
        
      case PricingCombination.TRAVEL_PER_MINUTE:
        // Use Google Distance API results  
        const travelTime = this.getServiceTravelTime(serviceAddresses, travel_breakdown);
        cost = travelTime * tier.price;
        duration_mins = travelTime;
        break;
        
      case PricingCombination.SERVICE_FIXED_PER_SERVICE:
        // Fixed price regardless of other factors
        cost = tier.price;
        duration_mins = this.getEstimatedDuration(tier.duration_estimate_mins);
        break;
        
      default:
        throw new Error(`Unsupported pricing combination: ${component.pricing_combination}`);
    }
    
    return { cost, duration_mins };
  }

  private calculateBusinessFees(amount: number, business: Business): BusinessFeeBreakdown {
    // Calculate GST if business charges it
    const gst_rate = business.charges_gst ? (business.gst_rate || 0) : 0;
    const gst_amount = business.charges_gst && business.gst_rate 
      ? amount * (business.gst_rate / 100) 
      : 0;
    
    // Calculate payment processing fee only if deposit is required
    const payment_processing_fee_percentage = business.payment_processing_fee_percentage || 0;
    const payment_processing_fee = business.charges_deposit 
      ? amount * (business.payment_processing_fee_percentage / 100)
      : 0;
    
    // Calculate platform fee using business configuration
    const platform_fee_percentage = business.booking_platform_fee_percentage || 0;
    const platform_fee = amount * (business.booking_platform_fee_percentage / 100);
    
    return {
      gst_amount,
      gst_rate,
      platform_fee,
      platform_fee_amount: platform_fee, // Alias for amount
      platform_fee_percentage,
      payment_processing_fee,
      payment_processing_fee_amount: payment_processing_fee, // Alias for amount
      payment_processing_fee_percentage,
      other_fees: []
    };
  }

  private calculateDeposit(total_amount: number, business: Business): number {
    if (!business.charges_deposit) {
      return 0;
    }
    
    if (business.deposit_type === DepositType.FIXED && business.deposit_fixed_amount) {
      return business.deposit_fixed_amount;
    }
    
    if (business.deposit_type === DepositType.PERCENTAGE && business.deposit_percentage) {
      return total_amount * (business.deposit_percentage / 100);
    }
    
    return 0;
  }



  private determineChargeableSegments(
    addresses: BookingAddress[], 
    model: TravelChargingModel
  ): Array<{from_address: string, to_address: string, is_chargeable: boolean, service_id?: string}> {
    
    const segments: Array<{from_address: string, to_address: string, is_chargeable: boolean, service_id?: string}> = [];
    
    // Sort addresses by sequence_order
    const sortedAddresses = addresses.sort((a, b) => a.sequence_order - b.sequence_order);
    
    switch (model) {
      case TravelChargingModel.BETWEEN_CUSTOMER_LOCATIONS:
        // Only charge between customer addresses (skip business base)
        const customerAddresses = sortedAddresses.filter(a => a.role !== AddressRole.BUSINESS_BASE);
        for (let i = 0; i < customerAddresses.length - 1; i++) {
          segments.push({
            from_address: `${customerAddresses[i].address.address_line_1}, ${customerAddresses[i].address.city}`,
            to_address: `${customerAddresses[i + 1].address.address_line_1}, ${customerAddresses[i + 1].address.city}`,
            is_chargeable: true,
            service_id: customerAddresses[i].service_id
          });
        }
        break;
        
      case TravelChargingModel.FROM_BASE_TO_CUSTOMERS:
        // Include base to first customer, then customer-to-customer
        for (let i = 0; i < sortedAddresses.length - 1; i++) {
          const isFirstSegment = i === 0;
          const fromBase = sortedAddresses[i].role === AddressRole.BUSINESS_BASE;
          
          segments.push({
            from_address: `${sortedAddresses[i].address.address_line_1}, ${sortedAddresses[i].address.city}`,
            to_address: `${sortedAddresses[i + 1].address.address_line_1}, ${sortedAddresses[i + 1].address.city}`,
            is_chargeable: isFirstSegment || !fromBase,
            service_id: sortedAddresses[i].service_id
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
            to_address: `${allAddresses[i + 1].address.address_line_1}, ${allAddresses[i + 1].address.city}`,
            is_chargeable: !isFromBase, // Don't charge from base, but charge back to base
            service_id: allAddresses[i].service_id
          });
        }
        break;
        
      case TravelChargingModel.FULL_ROUTE:
        // Charge for everything including return to base
        for (let i = 0; i < sortedAddresses.length - 1; i++) {
          segments.push({
            from_address: `${sortedAddresses[i].address.address_line_1}, ${sortedAddresses[i].address.city}`,
            to_address: `${sortedAddresses[i + 1].address.address_line_1}, ${sortedAddresses[i + 1].address.city}`,
            is_chargeable: true,
            service_id: sortedAddresses[i].service_id
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
      PricingCombination.TRAVEL_PER_KM_PER_VEHICLE,
      PricingCombination.TRAVEL_PER_MINUTE_PER_VEHICLE
    ].includes(combination);
  }

  private findApplicableTier(tiers: PricingTier[], quantity: number): PricingTier | null {
    return tiers.find(tier => 
      quantity >= tier.min_quantity && quantity <= tier.max_quantity
    ) || null;
  }

  private getEstimatedDuration(duration: number | Record<string, number> | null | undefined): number {
    if (typeof duration === 'number') {
      return duration;
    }
    if (typeof duration === 'object' && duration !== null) {
      return duration.multiple_items || duration.house_move_one_room || 60;
    }
    return 60; // Default fallback
  }

  private getServiceTravelDistance(serviceAddresses: BookingAddress[], travel_breakdown: TravelBreakdown): number {
    return travel_breakdown.route_segments
      .filter(segment => serviceAddresses.some(addr => 
`${addr.address.address_line_1}, ${addr.address.city}` === segment.from_address || 
        `${addr.address.address_line_1}, ${addr.address.city}` === segment.to_address
      ))
      .reduce((total, segment) => total + segment.distance_km, 0);
  }

  private getServiceTravelTime(serviceAddresses: BookingAddress[], travel_breakdown: TravelBreakdown): number {
    return travel_breakdown.route_segments
      .filter(segment => serviceAddresses.some(addr => 
`${addr.address.address_line_1}, ${addr.address.city}` === segment.from_address || 
        `${addr.address.address_line_1}, ${addr.address.city}` === segment.to_address
      ))
      .reduce((total, segment) => total + segment.duration_mins, 0);
  }
}
