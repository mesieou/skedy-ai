/**
 * Quote Input Builder
 *
 * Domain service for building quote calculation inputs:
 * - Transforms AI function args into booking calculation inputs
 * - Address processing and sequencing
 * - Service quantity and requirement mapping
 */

import type { Service } from '../../../shared/lib/database/types/service';
import type { Business } from '../../../shared/lib/database/types/business';
import type { BusinessContext } from '../../../shared/lib/database/types/business-context';
import type {
  BookingCalculationInput,
  BookingAddress,
  ServiceWithQuantity
} from '../types/booking-calculations';
import { AddressRole } from '../types/booking-calculations';
import { AddressUtils } from '../../../shared/utils/address-utils';

// ============================================================================
// TYPES
// ============================================================================

export interface QuoteInputData {
  service_name?: string;
  service_names?: string[];
  quantity?: number;
  job_scope?: string;
  pickup_address?: string;
  pickup_addresses?: string[];
  dropoff_address?: string;
  dropoff_addresses?: string[];
  service_address?: string;
  customer_addresses?: string[];
  preferred_datetime?: string;
  special_requirements?: string;
  number_of_people?: number;
  number_of_rooms?: number;
  square_meters?: number;
  number_of_vehicles?: number;
}

// ============================================================================
// QUOTE SERVICE
// ============================================================================

export class QuoteInputBuilder {
  /**
   * Build booking calculation input from quote arguments
   */
  static buildBookingInput(
    args: QuoteInputData,
    service: Service,
    businessContext: BusinessContext
  ): BookingCalculationInput {
    const addresses = this.buildAddressList(args, service, businessContext);
    const serviceWithQuantity = this.buildServiceWithQuantity(service, args, addresses);

    return {
      services: [serviceWithQuantity],
      business: businessContext.businessInfo as unknown as Business, // Type assertion for business conversion
      addresses
    };
  }

  /**
   * Build service with quantity from arguments
   */
  private static buildServiceWithQuantity(
    service: Service,
    args: QuoteInputData,
    addresses: BookingAddress[]
  ): ServiceWithQuantity {
    const quantity = args.quantity || args.number_of_people || args.number_of_rooms || args.number_of_vehicles || 1;
    const serviceAddresses = addresses.filter(addr => addr.service_id === service.id);

    return {
      service,
      quantity,
      serviceAddresses
    };
  }

  /**
   * Build complete address list for booking
   */
  private static buildAddressList(
    args: QuoteInputData,
    service: Service,
    businessContext: BusinessContext
  ): BookingAddress[] {
    const addresses: BookingAddress[] = [];
    let sequenceOrder = 0;

    // Add business base address
    addresses.push(this.createBusinessBaseAddress(sequenceOrder++, businessContext));

    // Add customer addresses
    addresses.push(...this.createCustomerAddresses(args, service, sequenceOrder));

    return addresses;
  }

  /**
   * Create business base address
   */
  private static createBusinessBaseAddress(
    sequenceOrder: number,
    businessContext: BusinessContext
  ): BookingAddress {
    return {
      id: 'business_base',
      address: AddressUtils.parseAddressString(businessContext.businessInfo.address),
      role: AddressRole.BUSINESS_BASE,
      sequence_order: sequenceOrder
    };
  }

  /**
   * Create customer addresses from arguments
   */
  private static createCustomerAddresses(
    args: QuoteInputData,
    service: Service,
    startingSequence: number
  ): BookingAddress[] {
    const addresses: BookingAddress[] = [];
    let sequenceOrder = startingSequence;

    // Process pickup addresses
    if (args.pickup_addresses && Array.isArray(args.pickup_addresses)) {
      addresses.push(...this.createAddressesFromArray(args.pickup_addresses, AddressRole.PICKUP, service.id, sequenceOrder));
      sequenceOrder += args.pickup_addresses.length;
    } else if (args.pickup_address) {
      addresses.push(this.createSingleAddress(args.pickup_address, AddressRole.PICKUP, service.id, sequenceOrder++));
    }

    // Process dropoff addresses
    if (args.dropoff_addresses && Array.isArray(args.dropoff_addresses)) {
      addresses.push(...this.createAddressesFromArray(args.dropoff_addresses, AddressRole.DROPOFF, service.id, sequenceOrder));
      sequenceOrder += args.dropoff_addresses.length;
    } else if (args.dropoff_address) {
      addresses.push(this.createSingleAddress(args.dropoff_address, AddressRole.DROPOFF, service.id, sequenceOrder++));
    }

    // Process service address
    if (args.service_address) {
      addresses.push(this.createSingleAddress(args.service_address, AddressRole.SERVICE, service.id, sequenceOrder));
    }

    return addresses;
  }

  /**
   * Create multiple addresses from array
   */
  private static createAddressesFromArray(
    addressStrings: string[],
    role: AddressRole,
    serviceId: string,
    startingSequence: number
  ): BookingAddress[] {
    console.log(`📍 Processing ${addressStrings.length} ${role} addresses:`, addressStrings);

    return addressStrings.map((addressString, index) => {
      const parsedAddress = AddressUtils.parseAddressString(addressString);
      console.log(`📍 Parsed ${role} address ${index}:`, parsedAddress);

      return {
        id: `${role}_${index}`,
        address: parsedAddress,
        role,
        sequence_order: startingSequence + index,
        service_id: serviceId
      };
    });
  }

  /**
   * Create single address
   */
  private static createSingleAddress(
    addressString: string,
    role: AddressRole,
    serviceId: string,
    sequenceOrder: number
  ): BookingAddress {
    return {
      id: role,
      address: AddressUtils.parseAddressString(addressString),
      role,
      sequence_order: sequenceOrder,
      service_id: serviceId
    };
  }
}
