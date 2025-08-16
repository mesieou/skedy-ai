import { BookingCalculator } from '../../../../scheduling/lib/bookings/booking-calculator';
import { BusinessSeeder } from '../../../lib/database/seeds/business-seeder';
import { ServiceSeeder } from '../../../lib/database/seeds/service-seeder';
import { AddressSeeder } from '../../../lib/database/seeds/address-seeder';
import { AuthUserSeeder } from '../../../lib/database/seeds/auth-user-seeder';
import { UserSeeder } from '../../../lib/database/seeds/user-seeder';

// Test data imports
import { 
  removalistBusinessData, 
  mobileManicuristBusinessData, 
  massageBusinessData 
} from '../../../lib/database/seeds/data/business-data';

import {
  removalistExample1ServiceData,
  removalistExample2ServiceData,
  removalistExample3ServiceData,
  removalistExample4ServiceData,
  manicuristExample5Service1Data,
  manicuristExample5Service2Data,
  manicuristExample6ServiceData,
  manicuristExample7Service1Data,
  manicuristExample7Service2Data,
  manicuristExample8Service1Data,
  manicuristExample8Service2Data,
  massageExample9Service1Data,
  massageExample9Service2Data
} from '../../../lib/database/seeds/data/services-data';

import {
  removalistBaseAddress,
  manicuristBaseAddress,
  spaBaseAddress,
  melbournePickupAddress,
  richmondDropoffAddress,
  hawthornPickupAddress,
  camberweelDropoffAddress,
  brightonPickupAddress,
  toorakDropoffAddress,
  northMelbourneHomeAddress,
  southYarraApartmentAddress,
  fitzroyOfficeAddress,
  carltonHomeAddress
} from '../../../lib/database/seeds/data/addresses-data';

import { AddressRole } from '../../../../scheduling/lib/types/booking-calculations';
import type { 
  BookingCalculationInput, 
  ServiceWithQuantity,
  BookingAddress
} from '../../../../scheduling/lib/types/booking-calculations';
import type { DistanceApiRequest } from '../../../../scheduling/lib/types/google-distance-api';
import type { Business } from '../../../lib/database/types/business';
import type { Service } from '../../../lib/database/types/service';
import type { Address } from '../../../lib/database/types/addresses';

// Create mock function for Google Distance API that can be controlled per test
const createMockDistanceService = () => ({
  getBatchDistances: jest.fn().mockImplementation((requests: DistanceApiRequest[]) => {
    return requests.map((request) => {
      // Calculate realistic distance based on address names (suburb distance simulation)
      const origin = request.origin.toLowerCase();
      const destination = request.destination.toLowerCase();
      
      // Melbourne suburb distance simulation
      const baseDistance = origin.includes('melbourne') && destination.includes('richmond') ? 8.5 :
                         origin.includes('melbourne') && destination.includes('hawthorn') ? 12.0 :
                         origin.includes('hawthorn') && destination.includes('richmond') ? 7.2 :
                         origin.includes('collins') && destination.includes('burke') ? 1.2 :
                         origin.includes('prahran') && destination.includes('north melbourne') ? 15.5 :
                         origin.includes('prahran') && destination.includes('south yarra') ? 3.8 :
                         10.5; // Default

      const distance_km = Math.round(baseDistance * 100) / 100;
      // Duration calculation: distance ÷ speed (40 km/h default) × 60 minutes
      const duration_mins = Math.round((distance_km / 40) * 60);
      
      return {
        distance_km,
        duration_mins,
        status: 'OK'
      };
    });
  })
});

// Mock the Google Distance API module
jest.mock('../../../../scheduling/lib/services/google-distance-api', () => ({
  GoogleDistanceApiService: jest.fn().mockImplementation(() => createMockDistanceService())
}));

describe('BookingCalculator - Test Scenarios (Mocked API)', () => {
  // Set timeout for all tests in this describe block
  jest.setTimeout(15000);
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
  }, 30000); // 30 second timeout for setup

  afterAll(async () => {
    // Clean up test data
    await serviceSeeder.cleanup();
    await addressSeeder.cleanup();
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();
  }, 15000); // 15 second timeout for cleanup

  async function setupTestData() {
    // Create businesses
    businesses.removalist = await businessSeeder.createBusinessWith(removalistBusinessData);
    businesses.manicurist = await businessSeeder.createBusinessWith(mobileManicuristBusinessData);
    businesses.spa = await businessSeeder.createBusinessWith(massageBusinessData);

    // Create services with actual business IDs
    services.removalistExample1 = await serviceSeeder.createServiceWith({
      ...removalistExample1ServiceData,
      business_id: businesses.removalist.id
    });
    services.removalistExample2 = await serviceSeeder.createServiceWith({
      ...removalistExample2ServiceData,
      business_id: businesses.removalist.id
    });
    services.removalistExample3 = await serviceSeeder.createServiceWith({
      ...removalistExample3ServiceData,
      business_id: businesses.removalist.id
    });
    services.removalistExample4 = await serviceSeeder.createServiceWith({
      ...removalistExample4ServiceData,
      business_id: businesses.removalist.id
    });

    services.manicuristExample5Service1 = await serviceSeeder.createServiceWith({
      ...manicuristExample5Service1Data,
      business_id: businesses.manicurist.id
    });
    services.manicuristExample5Service2 = await serviceSeeder.createServiceWith({
      ...manicuristExample5Service2Data,
      business_id: businesses.manicurist.id
    });
    services.manicuristExample6 = await serviceSeeder.createServiceWith({
      ...manicuristExample6ServiceData,
      business_id: businesses.manicurist.id
    });
    services.manicuristExample7Service1 = await serviceSeeder.createServiceWith({
      ...manicuristExample7Service1Data,
      business_id: businesses.manicurist.id
    });
    services.manicuristExample7Service2 = await serviceSeeder.createServiceWith({
      ...manicuristExample7Service2Data,
      business_id: businesses.manicurist.id
    });
    services.manicuristExample8Service1 = await serviceSeeder.createServiceWith({
      ...manicuristExample8Service1Data,
      business_id: businesses.manicurist.id
    });
    services.manicuristExample8Service2 = await serviceSeeder.createServiceWith({
      ...manicuristExample8Service2Data,
      business_id: businesses.manicurist.id
    });

    services.massageExample9Service1 = await serviceSeeder.createServiceWith({
      ...massageExample9Service1Data,
      business_id: businesses.spa.id
    });
    services.massageExample9Service2 = await serviceSeeder.createServiceWith({
      ...massageExample9Service2Data,
      business_id: businesses.spa.id
    });

    // Create addresses (use placeholder service IDs)
    addresses.removalistBase = await addressSeeder.createAddressWith({
      ...removalistBaseAddress,
      service_id: services.removalistExample1.id
    });
    addresses.manicuristBase = await addressSeeder.createAddressWith({
      ...manicuristBaseAddress,
      service_id: services.manicuristExample5Service1.id
    });
    addresses.spaBase = await addressSeeder.createAddressWith({
      ...spaBaseAddress,
      service_id: services.massageExample9Service1.id
    });

    // Customer addresses
    addresses.melbournePickup = await addressSeeder.createAddressWith({
      ...melbournePickupAddress,
      service_id: services.removalistExample1.id
    });
    addresses.richmondDropoff = await addressSeeder.createAddressWith({
      ...richmondDropoffAddress,
      service_id: services.removalistExample1.id
    });
    addresses.hawthornPickup = await addressSeeder.createAddressWith({
      ...hawthornPickupAddress,
      service_id: services.removalistExample2.id
    });
    addresses.camberweelDropoff = await addressSeeder.createAddressWith({
      ...camberweelDropoffAddress,
      service_id: services.removalistExample4.id
    });
    addresses.brightonPickup = await addressSeeder.createAddressWith({
      ...brightonPickupAddress,
      service_id: services.removalistExample3.id
    });
    addresses.toorakDropoff = await addressSeeder.createAddressWith({
      ...toorakDropoffAddress,
      service_id: services.removalistExample3.id
    });

    // Manicurist customer addresses
    addresses.northMelbourneHome = await addressSeeder.createAddressWith({
      ...northMelbourneHomeAddress,
      service_id: services.manicuristExample5Service1.id
    });
    addresses.southYarraApartment = await addressSeeder.createAddressWith({
      ...southYarraApartmentAddress,
      service_id: services.manicuristExample6.id
    });
    addresses.fitzroyOffice = await addressSeeder.createAddressWith({
      ...fitzroyOfficeAddress,
      service_id: services.manicuristExample7Service1.id
    });
    addresses.carltonHome = await addressSeeder.createAddressWith({
      ...carltonHomeAddress,
      service_id: services.manicuristExample8Service2.id
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
      serviceAddresses: [] // Will be populated from addresses
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

  // ===================================================================
  // EXAMPLE 1-4: REMOVALIST SCENARIOS
  // ===================================================================

  describe('Removalist Scenarios (Examples 1-4)', () => {
    
    test('Example 1: Between Customer Locations Only', async () => {
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

      // Test basic calculation success
      expect(result).toBeDefined();
      expect(result.total_estimate_amount).toBeGreaterThan(0);
      expect(result.total_estimate_time_in_minutes).toBeGreaterThan(0);

      // Test service breakdown
      expect(result.price_breakdown.service_breakdowns).toHaveLength(1);
      const serviceBreakdown = result.price_breakdown.service_breakdowns[0];
      expect(serviceBreakdown.quantity).toBe(2);
      expect(serviceBreakdown.service_name).toBe('Local Removals - Between Customers');

      // Test travel calculation - should only charge between customers
      const travelBreakdown = result.price_breakdown.travel_breakdown;
      expect(travelBreakdown.total_travel_cost).toBeGreaterThan(0);
      expect(travelBreakdown.route_segments.length).toBeGreaterThan(0);
      
      // Melbourne to Richmond: 8.5km = 13 minutes travel
      // For 2 people at $1.50/minute and 13 minutes travel = $19.50
      expect(travelBreakdown.total_travel_cost).toBe(19.50);

      // Labor cost: 2 people × $145/hour × 1.5 hours = $217.50
      expect(serviceBreakdown.service_cost).toBe(217.50);

      console.log(`Example 1 - Total: $${result.total_estimate_amount}, Travel: $${travelBreakdown.total_travel_cost}`);
    });

    test('Example 2: From Base + Between Customers', async () => {
      const input = createBookingInput(
        businesses.removalist,
        [{ serviceKey: 'removalistExample2', quantity: 2 }],
        [
          { role: AddressRole.BUSINESS_BASE, addressKey: 'removalistBase', sequence_order: 0 },
          { role: AddressRole.PICKUP, addressKey: 'melbournePickup', sequence_order: 1 },
          { role: AddressRole.PICKUP, addressKey: 'hawthornPickup', sequence_order: 2 },
          { role: AddressRole.DROPOFF, addressKey: 'richmondDropoff', sequence_order: 3 },
          { role: AddressRole.BUSINESS_BASE, addressKey: 'removalistBase', sequence_order: 4 }
        ]
      );

      const result = await calculator.calculateBooking(input);

      expect(result).toBeDefined();
      expect(result.total_estimate_amount).toBeGreaterThan(0);

      // Test service breakdown 
      const serviceBreakdown = result.price_breakdown.service_breakdowns[0];
      expect(serviceBreakdown.service_name).toBe('Interstate Removals - Base + Between');
      
      // Labor cost: $145/hour × 3 hours = $435
      expect(serviceBreakdown.service_cost).toBe(435);

      // Travel: Base→Melbourne(1.2km) + Melbourne→Hawthorn(12km) + Hawthorn→Richmond(7.2km) = 20.4km total
      // 20.4km × $2.50/km = $51.00
      const travelBreakdown = result.price_breakdown.travel_breakdown;
      expect(travelBreakdown.total_travel_cost).toBe(51.00);

      console.log(`Example 2 - Total: $${result.total_estimate_amount}, Travel: $${travelBreakdown.total_travel_cost}`);
    });

    test('Example 3: Between Customers + Return to Base', async () => {
      const input = createBookingInput(
        businesses.removalist,
        [{ serviceKey: 'removalistExample3', quantity: 3 }],
        [
          { role: AddressRole.BUSINESS_BASE, addressKey: 'removalistBase', sequence_order: 0 },
          { role: AddressRole.PICKUP, addressKey: 'brightonPickup', sequence_order: 1 },
          { role: AddressRole.PICKUP, addressKey: 'hawthornPickup', sequence_order: 2 },
          { role: AddressRole.DROPOFF, addressKey: 'toorakDropoff', sequence_order: 3 },
          { role: AddressRole.BUSINESS_BASE, addressKey: 'removalistBase', sequence_order: 4 }
        ]
      );

      const result = await calculator.calculateBooking(input);

      expect(result).toBeDefined();
      const serviceBreakdown = result.price_breakdown.service_breakdowns[0];
      expect(serviceBreakdown.service_name).toBe('Premium Removals - Between + Return');
      
      // Labor: 3 people × $200/hour × 1.33 hours = $266.67
      expect(serviceBreakdown.service_cost).toBeCloseTo(266.67, 2);

      // Travel: Should NOT charge initial trip from base, but charge between customers + return
      const travelBreakdown = result.price_breakdown.travel_breakdown;
      expect(travelBreakdown.total_travel_cost).toBe(0); // No travel component in this service

      console.log(`Example 3 - Total: $${result.total_estimate_amount}`);
    });
  });

  // ===================================================================
  // EXAMPLE 5-8: MANICURIST SCENARIOS  
  // ===================================================================

  describe('Manicurist Scenarios (Examples 5-8)', () => {

    test('Example 5: Multiple Simple Services', async () => {
      const input = createBookingInput(
        businesses.manicurist,
        [
          { serviceKey: 'manicuristExample5Service1', quantity: 1 },
          { serviceKey: 'manicuristExample5Service2', quantity: 1 }
        ],
        [
          { role: AddressRole.BUSINESS_BASE, addressKey: 'manicuristBase', sequence_order: 0 },
          { role: AddressRole.SERVICE, addressKey: 'northMelbourneHome', sequence_order: 1 },
          { role: AddressRole.BUSINESS_BASE, addressKey: 'manicuristBase', sequence_order: 2 }
        ]
      );

      const result = await calculator.calculateBooking(input);

      expect(result).toBeDefined();
      expect(result.price_breakdown.service_breakdowns).toHaveLength(2);

      // Service 1: Basic Manicure $45
      const service1 = result.price_breakdown.service_breakdowns[0];
      expect(service1.service_cost).toBe(45);

      // Service 2: Gel Manicure $65  
      const service2 = result.price_breakdown.service_breakdowns[1];
      expect(service2.service_cost).toBe(65);

      // Total service cost: $45 + $65 = $110
      const totalServiceCost = service1.service_cost + service2.service_cost;
      expect(totalServiceCost).toBe(110);

      console.log(`Example 5 - Total: $${result.total_estimate_amount}`);
    });

    test('Example 6: Service with Separate Travel Component', async () => {
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
      
      // Service: $80 fixed
      expect(serviceBreakdown.service_cost).toBe(80);

      // Travel: Prahran→South Yarra (3.8km) + return = 7.6km total = 11 minutes each way = 22 minutes total
      // 22 minutes × $1.20/minute = $26.40
      const travelBreakdown = result.price_breakdown.travel_breakdown;
      expect(travelBreakdown.total_travel_cost).toBe(26.40);

      console.log(`Example 6 - Total: $${result.total_estimate_amount}, Travel: $${travelBreakdown.total_travel_cost}`);
    });
  });

  // ===================================================================
  // EXAMPLE 9: SPA/MASSAGE SCENARIOS
  // ===================================================================

  describe('Spa/Massage Scenarios (Example 9)', () => {

    test('Example 9: In-Spa Services Only', async () => {
      const input = createBookingInput(
        businesses.spa,
        [
          { serviceKey: 'massageExample9Service1', quantity: 1 },
          { serviceKey: 'massageExample9Service2', quantity: 1 }
        ],
        [
          { role: AddressRole.BUSINESS_BASE, addressKey: 'spaBase', sequence_order: 0 }
        ]
      );

      const result = await calculator.calculateBooking(input);

      expect(result).toBeDefined();
      expect(result.price_breakdown.service_breakdowns).toHaveLength(2);

      // Service 1: 60-min massage $120
      const service1 = result.price_breakdown.service_breakdowns[0];
      expect(service1.service_cost).toBe(120);

      // Service 2: 90-min massage $160
      const service2 = result.price_breakdown.service_breakdowns[1];
      expect(service2.service_cost).toBe(160);

      // No travel for spa services
      const travelBreakdown = result.price_breakdown.travel_breakdown;
      expect(travelBreakdown.total_travel_cost).toBe(0);
      expect(travelBreakdown.route_segments).toHaveLength(0);

      // Total service cost: $120 + $160 = $280
      const totalServiceCost = service1.service_cost + service2.service_cost;
      expect(totalServiceCost).toBe(280);

      console.log(`Example 9 - Total: $${result.total_estimate_amount}`);
    });
  });

  // ===================================================================
  // BUSINESS FEES TESTING
  // ===================================================================

  describe('Business Fees and Charges', () => {

    test('GST Calculation for Removalist (10% GST)', async () => {
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
      const businessFees = result.price_breakdown.business_fees;

      expect(businessFees.gst_rate).toBe(10);
      expect(businessFees.gst_amount).toBeGreaterThan(0);
      
      // GST should be 10% of subtotal before fees
      const subtotal = result.price_breakdown.service_breakdowns[0].service_cost + 
                      result.price_breakdown.travel_breakdown.total_travel_cost;
      const expectedGST = subtotal * 0.1;
      expect(businessFees.gst_amount).toBeCloseTo(expectedGST, 2);

      console.log(`Removalist GST: $${businessFees.gst_amount} on subtotal $${subtotal}`);
    });

    test('No GST for Manicurist Business', async () => {
      const input = createBookingInput(
        businesses.manicurist,
        [{ serviceKey: 'manicuristExample5Service1', quantity: 1 }],
        [
          { role: AddressRole.BUSINESS_BASE, addressKey: 'manicuristBase', sequence_order: 0 },
          { role: AddressRole.SERVICE, addressKey: 'northMelbourneHome', sequence_order: 1 },
          { role: AddressRole.BUSINESS_BASE, addressKey: 'manicuristBase', sequence_order: 2 }
        ]
      );

      const result = await calculator.calculateBooking(input);
      const businessFees = result.price_breakdown.business_fees;

      expect(businessFees.gst_rate).toBe(0);
      expect(businessFees.gst_amount).toBe(0);

      console.log(`Manicurist - No GST applied`);
    });

    test('Deposit Calculation - Fixed vs Percentage', async () => {
      // Test fixed deposit (Removalist: $100 fixed)
      const removalistInput = createBookingInput(
        businesses.removalist,
        [{ serviceKey: 'removalistExample1', quantity: 1 }],
        [
          { role: AddressRole.BUSINESS_BASE, addressKey: 'removalistBase', sequence_order: 0 },
          { role: AddressRole.PICKUP, addressKey: 'melbournePickup', sequence_order: 1 },
          { role: AddressRole.DROPOFF, addressKey: 'richmondDropoff', sequence_order: 2 },
          { role: AddressRole.BUSINESS_BASE, addressKey: 'removalistBase', sequence_order: 3 }
        ]
      );

      const removalistResult = await calculator.calculateBooking(removalistInput);
      expect(removalistResult.deposit_amount).toBe(100); // Fixed $100

      // Test percentage deposit (Manicurist: 50%)
      const manicuristInput = createBookingInput(
        businesses.manicurist,
        [{ serviceKey: 'manicuristExample5Service1', quantity: 1 }],
        [
          { role: AddressRole.BUSINESS_BASE, addressKey: 'manicuristBase', sequence_order: 0 },
          { role: AddressRole.SERVICE, addressKey: 'northMelbourneHome', sequence_order: 1 },
          { role: AddressRole.BUSINESS_BASE, addressKey: 'manicuristBase', sequence_order: 2 }
        ]
      );

      const manicuristResult = await calculator.calculateBooking(manicuristInput);
      const expectedDeposit = manicuristResult.total_estimate_amount * 0.5;
      expect(manicuristResult.deposit_amount).toBeCloseTo(expectedDeposit, 2);

      console.log(`Removalist deposit: $${removalistResult.deposit_amount} (fixed)`);
      console.log(`Manicurist deposit: $${manicuristResult.deposit_amount} (50% of $${manicuristResult.total_estimate_amount})`);
    });

    test('Minimum Charge Application', async () => {
      // Use a scenario that would result in low total to test minimum charge
      // Spa minimum is $80, services total $280, so minimum shouldn't apply
      const input = createBookingInput(
        businesses.spa,
        [{ serviceKey: 'massageExample9Service1', quantity: 1 }], // Just one service: $120
        [
          { role: AddressRole.BUSINESS_BASE, addressKey: 'spaBase', sequence_order: 0 }
        ]
      );

      const result = await calculator.calculateBooking(input);
      
      // $120 service > $80 minimum, so minimum shouldn't apply
      expect(result.minimum_charge_applied).toBe(false);
      expect(result.total_estimate_amount).toBeGreaterThan(80);

      console.log(`Spa service $120 > $80 minimum: ${!result.minimum_charge_applied ? 'No minimum applied' : 'Minimum applied'}`);
    });
  });
});
