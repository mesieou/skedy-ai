/**
 * Address Validator Test - Address Patterns
 *
 * Tests how different business scenarios send addresses to the validator:
 * 1. Removalist: pickup_addresses + dropoff_addresses (multiple addresses)
 * 2. Removalist: pickup_addresses + dropoff_addresses (2 addresses)
 * 3. Mobile service: customer_addresses (single address)
 */

import { AddressValidator } from '../../../lib/bookings/address-validator';

describe('AddressValidator - Address Patterns', () => {
  let addressValidator: AddressValidator;

  beforeEach(() => {
    addressValidator = new AddressValidator();
  });

  // ============================================================================
  // SCENARIO 1: REMOVALIST WITH MULTIPLE ADDRESSES (3+ locations)
  // ============================================================================

  describe('Scenario 1: Removalist - Multiple Addresses', () => {
    it('should validate multiple pickup and dropoff addresses', async () => {
      // Typical removalist quote with multiple pickups and dropoffs
      const quoteArgs = {
        pickup_addresses: [
          '45 Chapel Street, South Yarra, VIC',
          '123 Burke Road, Camberwell, VIC'
        ],
        dropoff_addresses: [
          '789 Collins Street, Melbourne, VIC'
        ],
        number_of_people: 3,
        job_scope: 'house_move_3_bedroom'
      };

      const validation = await addressValidator.validateQuoteAddresses(quoteArgs);

      expect(validation.isValid).toBe(true);
      expect(validation.addressResults).toHaveLength(3); // 2 pickups + 1 dropoff

      // Verify address types are correctly identified
      const pickupResults = validation.addressResults?.filter(r => r.type === 'pickup');
      const dropoffResults = validation.addressResults?.filter(r => r.type === 'dropoff');

      expect(pickupResults).toHaveLength(2);
      expect(dropoffResults).toHaveLength(1);

      // Check specific addresses are correctly categorized
      expect(pickupResults?.[0]?.address).toBe('45 Chapel Street, South Yarra, VIC');
      expect(pickupResults?.[1]?.address).toBe('123 Burke Road, Camberwell, VIC');
      expect(dropoffResults?.[0]?.address).toBe('789 Collins Street, Melbourne, VIC');

      console.log('🚚 Removalist multiple addresses validation:', {
        total_addresses: validation.addressResults?.length,
        pickups: pickupResults?.length,
        dropoffs: dropoffResults?.length,
        all_valid: validation.isValid
      });
    });

    it('should handle invalid pickup address in multiple address scenario', async () => {
      const quoteArgs = {
        pickup_addresses: [
          '45 Chapel Street, South Yarra, VIC', // Valid
          'Invalid Address' // Invalid - no suburb
        ],
        dropoff_addresses: ['789 Collins Street, Melbourne, VIC'],
        number_of_people: 2,
        job_scope: 'house_move_2_bedroom'
      };

      const validation = await addressValidator.validateQuoteAddresses(quoteArgs);

      expect(validation.isValid).toBe(false);
      expect(validation.message).toContain('pickup address');
      expect(validation.message).toContain('Invalid Address');
    });
  });

  // ============================================================================
  // SCENARIO 2: REMOVALIST WITH 2 ADDRESSES (Simple pickup → dropoff)
  // ============================================================================

  describe('Scenario 2: Removalist - Two Addresses', () => {
    it('should validate simple pickup and dropoff addresses', async () => {
      // Simple removalist job - one pickup, one dropoff
      const quoteArgs = {
        pickup_addresses: ['123 Collins Street, Melbourne, VIC'],
        dropoff_addresses: ['456 Chapel Street, Richmond, VIC'],
        number_of_people: 2,
        job_scope: 'few_items'
      };

      const validation = await addressValidator.validateQuoteAddresses(quoteArgs);

      expect(validation.isValid).toBe(true);
      expect(validation.addressResults).toHaveLength(2);

      const pickupResult = validation.addressResults?.find(r => r.type === 'pickup');
      const dropoffResult = validation.addressResults?.find(r => r.type === 'dropoff');

      expect(pickupResult?.address).toBe('123 Collins Street, Melbourne, VIC');
      expect(dropoffResult?.address).toBe('456 Chapel Street, Richmond, VIC');

      console.log('📦 Removalist two addresses validation:', {
        pickup_valid: pickupResult?.result.isValid,
        dropoff_valid: dropoffResult?.result.isValid,
        pickup_confidence: pickupResult?.result.confidence,
        dropoff_confidence: dropoffResult?.result.confidence
      });
    });

    it('should handle legacy single address format', async () => {
      // Some services might still use single address fields
      const quoteArgs = {
        pickup_address: '789 Burke Road, Camberwell, VIC',
        dropoff_address: '321 High Street, Prahran, VIC',
        number_of_people: 1,
        job_scope: 'one_item'
      };

      const validation = await addressValidator.validateQuoteAddresses(quoteArgs);

      expect(validation.isValid).toBe(true);
      expect(validation.addressResults).toHaveLength(2);

      const addresses = validation.addressResults?.map(r => r.address);
      expect(addresses).toContain('789 Burke Road, Camberwell, VIC');
      expect(addresses).toContain('321 High Street, Prahran, VIC');
    });
  });

  // ============================================================================
  // SCENARIO 3: MOBILE SERVICE WITH CUSTOMER ADDRESS (Single location)
  // ============================================================================

  describe('Scenario 3: Mobile Service - Customer Address', () => {
    it('should validate single customer address for mobile services', async () => {
      // Mobile service (plumber, cleaner, beautician) - customer location only
      const quoteArgs = {
        customer_addresses: ['567 Toorak Road, Toorak, VIC'],
        // Mobile services typically don't need number_of_people
      };

      const validation = await addressValidator.validateQuoteAddresses(quoteArgs);

      expect(validation.isValid).toBe(true);
      expect(validation.addressResults).toHaveLength(1);

      const customerResult = validation.addressResults?.[0];
      expect(customerResult?.type).toBe('service');
      expect(customerResult?.address).toBe('567 Toorak Road, Toorak, VIC');

      console.log('🔧 Mobile service customer address validation:', {
        address: customerResult?.address,
        type: customerResult?.type,
        valid: customerResult?.result.isValid,
        confidence: customerResult?.result.confidence,
        formatted: customerResult?.result.formattedAddress
      });
    });

    it('should handle service_address field for mobile services', async () => {
      // Alternative field name for mobile services
      const quoteArgs = {
        service_address: '123 Main Street, Hawthorn, VIC'
      };

      const validation = await addressValidator.validateQuoteAddresses(quoteArgs);

      expect(validation.isValid).toBe(true);
      expect(validation.addressResults).toHaveLength(1);
      expect(validation.addressResults?.[0]?.type).toBe('service');
    });

    it('should reject invalid customer address', async () => {
      const quoteArgs = {
        customer_addresses: [''] // Empty address
      };

      const validation = await addressValidator.validateQuoteAddresses(quoteArgs);

      expect(validation.isValid).toBe(false);
      expect(validation.message).toContain('complete address');
    });
  });

  // ============================================================================
  // CROSS-SCENARIO VALIDATION TESTS
  // ============================================================================

  describe('Cross-Scenario Validation', () => {
    it('should handle mixed address types in complex scenarios', async () => {
      // Complex scenario with pickup, dropoff, and service addresses
      const quoteArgs = {
        pickup_addresses: ['123 Collins Street, Melbourne, VIC'],
        dropoff_addresses: ['456 Chapel Street, Richmond, VIC'],
        service_address: '789 High Street, Prahran, VIC'
      };

      const validation = await addressValidator.validateQuoteAddresses(quoteArgs);

      expect(validation.isValid).toBe(true);
      expect(validation.addressResults).toHaveLength(3);

      const addressTypes = validation.addressResults?.map(r => r.type);
      expect(addressTypes).toContain('pickup');
      expect(addressTypes).toContain('dropoff');
      expect(addressTypes).toContain('service');
    });

    it('should provide standardized addresses for Google API integration', async () => {
      const quoteArgs = {
        pickup_addresses: ['Collins Street, Melbourne'],
        dropoff_addresses: ['Chapel Street, Richmond']
      };

      const validation = await addressValidator.validateQuoteAddresses(quoteArgs);

      if (validation.isValid && validation.addressResults) {
        const standardized = addressValidator.getStandardizedAddresses(validation);

        expect(Object.keys(standardized)).toHaveLength(2);

        // Standardized addresses should be properly formatted by Google API
        Object.entries(standardized).forEach(([original, formatted]) => {
          expect(formatted).toBeDefined();
          expect(formatted.length).toBeGreaterThanOrEqual(original.length);
        });

        console.log('📍 Address standardization:', standardized);
      }
    });

    it('should handle empty address arrays', async () => {
      const quoteArgs = {
        pickup_addresses: [],
        dropoff_addresses: []
      };

      const validation = await addressValidator.validateQuoteAddresses(quoteArgs);

      expect(validation.isValid).toBe(false);
      expect(validation.message).toContain('at least one');
    });

    it('should validate batch addresses efficiently', async () => {
      const addresses = [
        '123 Collins Street, Melbourne, VIC',
        '456 Chapel Street, Richmond, VIC',
        '789 Burke Road, Camberwell, VIC',
        '321 High Street, Prahran, VIC'
      ];

      const startTime = Date.now();
      const results = await addressValidator.validateAddresses({ addresses });
      const duration = Date.now() - startTime;

      expect(results.isValid).toBe(true);
      expect(results.addressResults).toHaveLength(4);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`🚀 Batch validation completed in ${duration}ms for ${addresses.length} addresses`);
    });
  });
});
