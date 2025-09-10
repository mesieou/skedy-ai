/**
 * Address Validator for Booking System
 *
 * Domain service for validating addresses before quote/booking processing
 * Uses Google Address Validation API with fallback validation
 */

import { GoogleAddressValidationService, type AddressValidationResult } from '../services/google-address-validation';
import { AddressRole } from '../types/booking-calculations';

export interface AddressValidationRequest {
  addresses: string[];
  addressTypes?: Record<string, AddressRole>;
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
  addressResults?: Array<{
    address: string;
    type: AddressRole;
    result: AddressValidationResult;
  }>;
}

export class AddressValidator {
  private readonly googleValidator: GoogleAddressValidationService;

  constructor() {
    this.googleValidator = new GoogleAddressValidationService();
  }

  /**
   * Validate addresses for booking/quote processing
   */
  async validateAddresses(request: AddressValidationRequest): Promise<ValidationResult> {
    const { addresses, addressTypes = {} } = request;

    if (addresses.length === 0) {
      return {
        isValid: false,
        message: "Please provide at least one pickup and dropoff address."
      };
    }

    try {
      console.log(`🏠 [AddressValidator] Validating ${addresses.length} addresses with Google API`);

      // Validate all addresses using Google API
      const validationResults = await this.googleValidator.validateAddresses(addresses);
      const addressResults: ValidationResult['addressResults'] = [];

      // Check each address
      for (let i = 0; i < validationResults.length; i++) {
        const result = validationResults[i];
        const address = addresses[i];
        const addressType = this.getAddressType(address, addressTypes);

        addressResults.push({
          address,
          type: addressType,
          result
        });

        if (!result.isValid) {
          console.log(`❌ [AddressValidator] Invalid address: ${address}`, result.issues);

          const issues = result.issues?.join(', ') || 'Address could not be validated';

          return {
            isValid: false,
            message: `The ${addressType} address "${address}" appears to be invalid. ${issues}. Please provide a complete address with street number, street name, and suburb.`,
            addressResults
          };
        }

        // Log successful validation
        console.log(`✅ [AddressValidator] Valid address: ${result.formattedAddress} (confidence: ${result.confidence})`);

        // TODO: Add service area coverage check here when needed
        // const coverageCheck = await this.checkServiceCoverage(result);
        // if (!coverageCheck.isServiced) {
        //   return {
        //     isValid: false,
        //     message: `Sorry, we don't currently service the ${result.components?.suburb} area.`,
        //     addressResults
        //   };
        // }
      }

      return {
        isValid: true,
        message: "All addresses validated successfully",
        addressResults
      };

    } catch (error) {
      console.error('❌ [AddressValidator] Address validation failed:', error);
      // Fallback to basic validation if Google API fails
      return this.basicAddressValidation(addresses, addressTypes);
    }
  }

  /**
   * Validate addresses from quote function arguments
   */
  async validateQuoteAddresses(args: {
    pickup_addresses?: string[];
    dropoff_addresses?: string[];
    pickup_address?: string;
    dropoff_address?: string;
    customer_addresses?: string[];
    service_address?: string;
  }): Promise<ValidationResult> {
    const addresses: string[] = [];
    const addressTypes: Record<string, AddressRole> = {};

    // Collect pickup addresses
    if (args.pickup_addresses && Array.isArray(args.pickup_addresses)) {
      for (const address of args.pickup_addresses) {
        addresses.push(address);
        addressTypes[address] = AddressRole.PICKUP;
      }
    }

    // Collect dropoff addresses
    if (args.dropoff_addresses && Array.isArray(args.dropoff_addresses)) {
      for (const address of args.dropoff_addresses) {
        addresses.push(address);
        addressTypes[address] = AddressRole.DROPOFF;
      }
    }

    // Handle single addresses (fallback)
    if (args.pickup_address) {
      addresses.push(args.pickup_address);
      addressTypes[args.pickup_address] = AddressRole.PICKUP;
    }

    if (args.dropoff_address) {
      addresses.push(args.dropoff_address);
      addressTypes[args.dropoff_address] = AddressRole.DROPOFF;
    }

    // Handle customer addresses (used by plumber/mobile services)
    if (args.customer_addresses && Array.isArray(args.customer_addresses)) {
      for (const address of args.customer_addresses) {
        addresses.push(address);
        addressTypes[address] = AddressRole.SERVICE;
      }
    }

    // Handle single service address
    if (args.service_address) {
      addresses.push(args.service_address);
      addressTypes[args.service_address] = AddressRole.SERVICE;
    }

    return this.validateAddresses({ addresses, addressTypes });
  }

  /**
   * Get standardized addresses from validation results
   */
  getStandardizedAddresses(validationResult: ValidationResult): Record<string, string> {
    const standardized: Record<string, string> = {};

    if (validationResult.addressResults) {
      for (const addressResult of validationResult.addressResults) {
        standardized[addressResult.address] = addressResult.result.formattedAddress || addressResult.address;
      }
    }

    return standardized;
  }

  /**
   * Future: Check if address is within service area
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async checkServiceCoverage(_validationResult: AddressValidationResult): Promise<{
    isServiced: boolean;
    reason?: string;
  }> {
    // TODO: Implement service area coverage logic
    // This could check:
    // - Distance from business base
    // - Specific suburbs/postcodes served
    // - Geographic boundaries

    return { isServiced: true };
  }

  /**
   * Determine address type for better error messages
   */
  private getAddressType(address: string, addressTypes: Record<string, AddressRole>): AddressRole {
    return addressTypes[address] || AddressRole.SERVICE;
  }

  /**
   * Fallback validation if Google API is unavailable
   */
  private basicAddressValidation(
    addresses: string[],
    addressTypes: Record<string, AddressRole>
  ): ValidationResult {
    for (const address of addresses) {
      if (!address || address.trim().length < 10 || !address.includes(',')) {
        const addressType = this.getAddressType(address, addressTypes);
        return {
          isValid: false,
          message: `Please provide a complete ${addressType} address with street, suburb. Example: "123 Smith Street, Melbourne"`
        };
      }
    }

    return {
      isValid: true,
      message: "Basic validation passed (Google API unavailable)"
    };
  }
}
