/**
 * Address Utilities
 *
 * Utility functions for address parsing and formatting
 */

import type { Address } from '../lib/database/types/addresses';
import { AddressType } from '../lib/database/types/addresses';

export class AddressUtils {
  /**
   * Parse address string into structured Address object
   */
  static parseAddressString(addressString: string): Address {
    const parts = addressString.split(',').map(p => p.trim());
    return {
      id: 'temp-' + Math.random().toString(36).substring(7),
      service_id: 'temp',
      type: AddressType.CUSTOMER,
      address_line_1: parts[0] || addressString,
      address_line_2: null,
      city: parts[1] || 'Melbourne',
      state: parts[2] || 'VIC',
      postcode: parts[3] || '3000',
      country: 'Australia',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Format address for display
   */
  static formatAddressForDisplay(address: Address): string {
    const parts = [
      address.address_line_1,
      address.address_line_2,
      address.city,
      address.state,
      address.postcode
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Validate address string format
   */
  static isValidAddressString(addressString: string): boolean {
    return addressString.trim().length > 0 && addressString.includes(',');
  }
}
