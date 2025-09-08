/**
 * Integration tests for BookingCalculator with real Google Distance API
 * These tests are slower and require a Google API key
 * Run with: npm test -- booking-calculator-integration.test.ts
 *
 * Environment Variables Required:
 * - GOOGLE_MAPS_API_KEY: Your Google Maps API key
 * - USE_MOCK_DISTANCE_API: Set to 'false' to use real API
 */

import { BookingCalculator } from '../../../../scheduling/lib/bookings/pricing-calculator';
import { BusinessSeeder } from '../../../lib/database/seeds/business-seeder';
import { ServiceSeeder } from '../../../lib/database/seeds/service-seeder';
import { AddressSeeder } from '../../../lib/database/seeds/address-seeder';
import { AuthUserSeeder } from '../../../lib/database/seeds/auth-user-seeder';
import { UserSeeder } from '../../../lib/database/seeds/user-seeder';

// Test data imports
import {
  createUniqueRemovalistBusinessData,
  createUniqueMobileManicuristBusinessData
} from '../../../lib/database/seeds/data/business-data';

import {
  removalistExample1ServiceData,
  manicuristExample6ServiceData
} from '../../../lib/database/seeds/data/services-data';

import {
  removalistBaseAddress,
  manicuristBaseAddress,
  melbournePickupAddress,
  richmondDropoffAddress,
  hawthornPickupAddress,
  toorakDropoffAddress,
  southYarraApartmentAddress
} from '../../../lib/database/seeds/data/addresses-data';

import { AddressRole } from '../../../../scheduling/lib/types/booking-calculations';
import type {
  BookingCalculationInput,
  ServiceWithQuantity,
  BookingAddress
} from '../../../../scheduling/lib/types/booking-calculations';
import type { Business } from '../../../lib/database/types/business';
import type { Service } from '../../../lib/database/types/service';
import type { Address } from '../../../lib/database/types/addresses';

// Skip these tests if no API key is configured or if explicitly mocking
const skipRealApiTests = !process.env.GOOGLE_MAPS_API_KEY || process.env.USE_MOCK_DISTANCE_API !== 'false';

const describeRealApi = skipRealApiTests ? describe.skip : describe;

describeRealApi('BookingCalculator - Real Google API Integration', () => {
  let calculator: BookingCalculator;
  let businessSeeder: BusinessSeeder;
  let serviceSeeder: ServiceSeeder;
  let addressSeeder: AddressSeeder;
  let authUserSeeder: AuthUserSeeder;
  let userSeeder: UserSeeder;

  // Test data containers
  const businesses: Record<string, Business> = {};
  const services: Record<string, Service> = {};
  const addresses: Record<string, Address> = {};

  beforeAll(async () => {
    // Set environment to force real API usage
    process.env.USE_MOCK_DISTANCE_API = 'false';

    calculator = new BookingCalculator();
    businessSeeder = new BusinessSeeder();
    serviceSeeder = new ServiceSeeder();
    addressSeeder = new AddressSeeder();
    authUserSeeder = new AuthUserSeeder();
    userSeeder = new UserSeeder(authUserSeeder);

    // Clean up existing test data
    await serviceSeeder.cleanup();
    await addressSeeder.cleanup();
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();

    // Setup test data
    await setupTestData();
  }, 30000); // Longer timeout for real API calls

  afterAll(async () => {
    // Clean up test data
    await serviceSeeder.cleanup();
    await addressSeeder.cleanup();
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();

    // Reset environment
    delete process.env.USE_MOCK_DISTANCE_API;
  });

  async function setupTestData() {
    // Create businesses
    businesses.removalist = await businessSeeder.createBusinessWith(createUniqueRemovalistBusinessData());
    businesses.manicurist = await businessSeeder.createBusinessWith(createUniqueMobileManicuristBusinessData());

    // Create services
    services.removalistExample1 = await serviceSeeder.createServiceWith({
      ...removalistExample1ServiceData,
      business_id: businesses.removalist.id
    });

    services.manicuristExample6 = await serviceSeeder.createServiceWith({
      ...manicuristExample6ServiceData,
      business_id: businesses.manicurist.id
    });

    // Create addresses
    addresses.removalistBase = await addressSeeder.createAddressWith({
      ...removalistBaseAddress,
      service_id: services.removalistExample1.id
    });
    addresses.manicuristBase = await addressSeeder.createAddressWith({
      ...manicuristBaseAddress,
      service_id: services.manicuristExample6.id
    });
    addresses.melbournePickup = await addressSeeder.createAddressWith({
      ...melbournePickupAddress,
      service_id: services.removalistExample1.id
    });
    addresses.richmondDropoff = await addressSeeder.createAddressWith({
      ...richmondDropoffAddress,
      service_id: services.removalistExample1.id
    });
    addresses.southYarraApartment = await addressSeeder.createAddressWith({
      ...southYarraApartmentAddress,
      service_id: services.manicuristExample6.id
    });

    // Additional addresses for multi-stop test
    addresses.hawthornPickup = await addressSeeder.createAddressWith({
      ...hawthornPickupAddress,
      service_id: services.removalistExample1.id
    });
    addresses.toorakDropoff = await addressSeeder.createAddressWith({
      ...toorakDropoffAddress,
      service_id: services.removalistExample1.id
    });
  }

  function createBookingInput(
    business: Business,
    serviceItems: Array<{ serviceKey: string; quantity: number }>,
    addressItems: Array<{ role: AddressRole; addressKey: string; sequence_order: number; service_id?: string }>
  ): BookingCalculationInput {
    const servicesWithQuantity: ServiceWithQuantity[] = serviceItems.map(item => ({
      service: services[item.serviceKey],
      quantity: item.quantity,
      serviceAddresses: []
    }));

    const bookingAddresses: BookingAddress[] = addressItems.map(item => ({
      id: addresses[item.addressKey].id,
      address: addresses[item.addressKey],
      role: item.role,
      sequence_order: item.sequence_order,
      service_id: item.service_id || servicesWithQuantity[0]?.service.id
    }));

    return {
      services: servicesWithQuantity,
      business,
      addresses: bookingAddresses
    };
  }

  test('Real API: Melbourne to Richmond Removalist', async () => {
    const input = createBookingInput(
      businesses.removalist,
      [{ serviceKey: 'removalistExample1', quantity: 2 }],
      [
        { role: AddressRole.BUSINESS_BASE, addressKey: 'removalistBase', sequence_order: 0 },
        { role: AddressRole.PICKUP, addressKey: 'melbournePickup', sequence_order: 1 },
        { role: AddressRole.DROPOFF, addressKey: 'richmondDropoff', sequence_order: 2 },
        { role: AddressRole.BUSINESS_BASE, addressKey: 'removalistBase', sequence_order: 3 }
      ]
    );

    const result = await calculator.calculateBooking(input);

    expect(result).toBeDefined();
    expect(result.total_estimate_amount).toBeGreaterThan(0);
    expect(result.total_estimate_time_in_minutes).toBeGreaterThan(0);

    const travelBreakdown = result.price_breakdown.travel_breakdown;
    expect(travelBreakdown.total_travel_cost).toBeGreaterThan(0);
    expect(travelBreakdown.route_segments.length).toBeGreaterThan(0);

    // With real API, we can't predict exact values, but we can test reasonable ranges
    expect(travelBreakdown.total_distance_km).toBeGreaterThan(2); // Melbourne to Richmond should be > 2km
    expect(travelBreakdown.total_distance_km).toBeLessThan(50); // But < 50km
    expect(travelBreakdown.total_travel_time_mins).toBeGreaterThan(5); // > 5 minutes
    expect(travelBreakdown.total_travel_time_mins).toBeLessThan(60); // < 1 hour

    console.log(`Real API - Melbourne to Richmond:`);
    console.log(`  Distance: ${travelBreakdown.total_distance_km}km`);
    console.log(`  Duration: ${travelBreakdown.total_travel_time_mins} minutes`);
    console.log(`  Travel Cost: $${travelBreakdown.total_travel_cost}`);
    console.log(`  Total: $${result.total_estimate_amount}`);
  }, 20000); // 20 second timeout for real API

  test('Real API: Manicurist with Travel Component', async () => {
    const input = createBookingInput(
      businesses.manicurist,
      [{ serviceKey: 'manicuristExample6', quantity: 1 }],
      [
        { role: AddressRole.BUSINESS_BASE, addressKey: 'manicuristBase', sequence_order: 0 },
        { role: AddressRole.SERVICE, addressKey: 'southYarraApartment', sequence_order: 1 },
        { role: AddressRole.BUSINESS_BASE, addressKey: 'manicuristBase', sequence_order: 2 }
      ]
    );

    const result = await calculator.calculateBooking(input);

    expect(result).toBeDefined();
    const serviceBreakdown = result.price_breakdown.service_breakdowns[0];
    expect(serviceBreakdown.service_cost).toBe(80); // Service cost should be fixed

    const travelBreakdown = result.price_breakdown.travel_breakdown;
    expect(travelBreakdown.total_travel_cost).toBeGreaterThan(0);

    // Prahran to South Yarra should be relatively close
    expect(travelBreakdown.total_distance_km).toBeGreaterThan(1);
    expect(travelBreakdown.total_distance_km).toBeLessThan(20);
    expect(travelBreakdown.total_travel_time_mins).toBeGreaterThan(3);
    expect(travelBreakdown.total_travel_time_mins).toBeLessThan(40);

    console.log(`Real API - Prahran to South Yarra:`);
    console.log(`  Distance: ${travelBreakdown.total_distance_km}km`);
    console.log(`  Duration: ${travelBreakdown.total_travel_time_mins} minutes`);
    console.log(`  Travel Cost: $${travelBreakdown.total_travel_cost}`);
    console.log(`  Total: $${result.total_estimate_amount}`);
  }, 20000);

  test('Real API: Route Segments Analysis', async () => {
    const input = createBookingInput(
      businesses.removalist,
      [{ serviceKey: 'removalistExample1', quantity: 1 }],
      [
        { role: AddressRole.BUSINESS_BASE, addressKey: 'removalistBase', sequence_order: 0 },
        { role: AddressRole.PICKUP, addressKey: 'melbournePickup', sequence_order: 1 },
        { role: AddressRole.DROPOFF, addressKey: 'richmondDropoff', sequence_order: 2 },
        { role: AddressRole.BUSINESS_BASE, addressKey: 'removalistBase', sequence_order: 3 }
      ]
    );

    const result = await calculator.calculateBooking(input);
    const travelBreakdown = result.price_breakdown.travel_breakdown;

    // Should have route segments with real distance/duration data
    expect(travelBreakdown.route_segments).toBeDefined();
    expect(travelBreakdown.route_segments.length).toBeGreaterThan(0);

    // Check that all segments have real data
    travelBreakdown.route_segments.forEach((segment, index) => {
      expect(segment.distance_km).toBeGreaterThan(0);
      expect(segment.duration_mins).toBeGreaterThan(0);
      expect(segment.from_address).toBeDefined();
      expect(segment.to_address).toBeDefined();

      console.log(`Segment ${index + 1}: ${segment.from_address.slice(0, 20)}... → ${segment.to_address.slice(0, 20)}...`);
      console.log(`  ${segment.distance_km}km, ${segment.duration_mins}min, chargeable: ${segment.is_chargeable}`);
    });
  }, 20000);

  test('Real API: Complex Multi-Stop Route (2 Pickups + 2 Dropoffs)', async () => {
    const input = createBookingInput(
      businesses.removalist,
      [{ serviceKey: 'removalistExample1', quantity: 3 }], // 3-person team
      [
        { role: AddressRole.BUSINESS_BASE, addressKey: 'removalistBase', sequence_order: 0 },
        { role: AddressRole.PICKUP, addressKey: 'melbournePickup', sequence_order: 1 },
        { role: AddressRole.PICKUP, addressKey: 'hawthornPickup', sequence_order: 2 },
        { role: AddressRole.DROPOFF, addressKey: 'richmondDropoff', sequence_order: 3 },
        { role: AddressRole.DROPOFF, addressKey: 'toorakDropoff', sequence_order: 4 },
        { role: AddressRole.BUSINESS_BASE, addressKey: 'removalistBase', sequence_order: 5 }
      ]
    );

    const result = await calculator.calculateBooking(input);

    expect(result).toBeDefined();
    expect(result.total_estimate_amount).toBeGreaterThan(0);
    expect(result.total_estimate_time_in_minutes).toBeGreaterThan(0);

    const serviceBreakdown = result.price_breakdown.service_breakdowns[0];
    const travelBreakdown = result.price_breakdown.travel_breakdown;

    // Should have multiple route segments for complex route
    expect(travelBreakdown.route_segments.length).toBeGreaterThanOrEqual(3); // At least 3 segments

    // Multi-stop should have longer total distance and time
    expect(travelBreakdown.total_distance_km).toBeGreaterThan(10); // Multi-stop should be > 10km
    expect(travelBreakdown.total_distance_km).toBeLessThan(100); // But reasonable for Melbourne
    expect(travelBreakdown.total_travel_time_mins).toBeGreaterThan(15); // > 15 minutes
    expect(travelBreakdown.total_travel_time_mins).toBeLessThan(120); // < 2 hours

    // Service should use 3-person tier pricing
    expect(serviceBreakdown.quantity).toBe(3);

    console.log(`Real API - Multi-Stop Route (2 Pickups + 2 Dropoffs):`);
    console.log(`  Total Distance: ${travelBreakdown.total_distance_km}km`);
    console.log(`  Total Duration: ${travelBreakdown.total_travel_time_mins} minutes`);
    console.log(`  Travel Cost: $${travelBreakdown.total_travel_cost}`);
    console.log(`  Service Cost: $${serviceBreakdown.service_cost} (3-person team)`);
    console.log(`  Total: $${result.total_estimate_amount}`);

    console.log(`\n  Route breakdown:`);
    travelBreakdown.route_segments.forEach((segment, index) => {
      const fromShort = segment.from_address.split(',')[0]; // Just street name
      const toShort = segment.to_address.split(',')[0];
      console.log(`    ${index + 1}. ${fromShort} → ${toShort}: ${segment.distance_km}km, ${segment.duration_mins}min${segment.is_chargeable ? ' ✓' : ' (free)'}`);
    });

    // Verify route makes sense (should only charge between customer locations, not from/to base)
    const chargeableSegments = travelBreakdown.route_segments.filter(s => s.is_chargeable);
    expect(chargeableSegments.length).toBeGreaterThan(0); // Should have chargeable segments
    expect(chargeableSegments.length).toBeLessThan(travelBreakdown.route_segments.length); // Not all segments should be chargeable

    // Test that travel model BETWEEN_CUSTOMER_LOCATIONS is working correctly
    // First segment (base to first pickup) should not be chargeable
    expect(travelBreakdown.route_segments[0].is_chargeable).toBe(false);
    // Last segment (last dropoff to base) should not be chargeable
    expect(travelBreakdown.route_segments[travelBreakdown.route_segments.length - 1].is_chargeable).toBe(false);
  }, 30000); // Longer timeout for complex route
});

// Always run this test to show when real API tests are skipped
describe('BookingCalculator - API Configuration', () => {
  test('Real API test configuration check', () => {
    const hasApiKey = !!process.env.GOOGLE_MAPS_API_KEY;
    const useMockApi = process.env.USE_MOCK_DISTANCE_API !== 'false';

    console.log('=== Google Distance API Configuration ===');
    console.log(`API Key configured: ${hasApiKey ? 'YES' : 'NO'}`);
    console.log(`Use mock API: ${useMockApi ? 'YES' : 'NO'}`);

    if (skipRealApiTests) {
      console.log('⚠️  Real API tests are SKIPPED');
      console.log('To run real API tests:');
      console.log('1. Set GOOGLE_MAPS_API_KEY environment variable');
      console.log('2. Set USE_MOCK_DISTANCE_API=false');
      console.log('3. Run: npm test booking-calculator-integration.test.ts');
    } else {
      console.log('✅ Real API tests will run');
    }

    // This test always passes, it's just for information
    expect(true).toBe(true);
  });
});
