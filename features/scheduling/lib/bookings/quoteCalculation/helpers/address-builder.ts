import type { Service } from '../../../../../shared/lib/database/types/service';
import type { Business } from '../../../../../shared/lib/database/types/business';
import type { BookingAddress } from '../../../types/booking-calculations';
import { AddressRole } from '../../../types/booking-calculations';
import { AddressUtils } from '../../../../../shared/utils/address-utils';
import type { QuoteRequestData } from '../../../types/booking-domain';

export class AddressBuilder {

  /**
   * Build addresses from raw quote request args (no transformer)
   */
  buildAddressesFromRawArgs(
    args: QuoteRequestData,
    service: Service,
    business: Business
  ): BookingAddress[] {
    const addresses: BookingAddress[] = [];
    let sequenceOrder = 0;

    // Add business base address
    addresses.push({
      id: 'business_base',
      address: AddressUtils.parseAddressString(business.address),
      role: AddressRole.BUSINESS_BASE,
      sequence_order: sequenceOrder++,
      service_id: service.id
    });

    // Process pickup addresses (handle both arrays and single)
    if (args.pickup_addresses && Array.isArray(args.pickup_addresses)) {
      args.pickup_addresses.forEach((addr, index) => {
        addresses.push({
          id: `pickup_${index}`,
          address: AddressUtils.parseAddressString(addr),
          role: AddressRole.PICKUP,
          sequence_order: sequenceOrder++,
          service_id: service.id
        });
      });
    } else if (args.pickup_address) {
      addresses.push({
        id: 'pickup',
        address: AddressUtils.parseAddressString(args.pickup_address),
        role: AddressRole.PICKUP,
        sequence_order: sequenceOrder++,
        service_id: service.id
      });
    }

    // Process dropoff addresses (handle both arrays and single)
    if (args.dropoff_addresses && Array.isArray(args.dropoff_addresses)) {
      args.dropoff_addresses.forEach((addr, index) => {
        addresses.push({
          id: `dropoff_${index}`,
          address: AddressUtils.parseAddressString(addr),
          role: AddressRole.DROPOFF,
          sequence_order: sequenceOrder++,
          service_id: service.id
        });
      });
    } else if (args.dropoff_address) {
      addresses.push({
        id: 'dropoff',
        address: AddressUtils.parseAddressString(args.dropoff_address),
        role: AddressRole.DROPOFF,
        sequence_order: sequenceOrder++,
        service_id: service.id
      });
    }

    // Process service address
    if (args.service_address) {
      addresses.push({
        id: 'service',
        address: AddressUtils.parseAddressString(args.service_address),
        role: AddressRole.SERVICE,
        sequence_order: sequenceOrder++,
        service_id: service.id
      });
    }

    // Process customer addresses array
    if (args.customer_addresses) {
      args.customer_addresses.forEach((addr, index) => {
        addresses.push({
          id: `customer_${index}`,
          address: AddressUtils.parseAddressString(addr),
          role: AddressRole.SERVICE,
          sequence_order: sequenceOrder++,
          service_id: service.id
        });
      });
    }

    return addresses;
  }
}
