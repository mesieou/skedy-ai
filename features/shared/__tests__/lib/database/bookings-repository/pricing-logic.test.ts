import { BookingsRepository } from '../../../../lib/database/repositories/bookings-respository';
import { BookingSeeder } from '../../../../lib/database/seeds/booking-seeder';
import { BusinessSeeder } from '../../../../lib/database/seeds/business-seeder';
import { UserSeeder } from '../../../../lib/database/seeds/user-seeder';
import { AuthUserSeeder } from '../../../../lib/database/seeds/auth-user-seeder';
import { ServiceSeeder } from '../../../../lib/database/seeds/service-seeder';

import { 
  removalistBusinessData, 
  cleaningBusinessData, 
  handymanBusinessData, 
  beautyBusinessData 
} from '../../../../lib/database/seeds/data/business-data';
import { adminProviderUserData } from '../../../../lib/database/seeds/data/user-data';
import { adminAuthUserData } from '../../../../lib/database/seeds/data/auth-user-data';
import { 
  removalServiceData, 
  housecleaningServiceData, 
  commercialCleaningServiceData,
  plumbingServiceData, 
  electricalServiceData,
  manicureServiceData 
} from '../../../../lib/database/seeds/data/services-data';
import { createBooking } from '../../../../lib/database/seeds/data/bookings-data';
import { addressMappings } from '../../../../lib/database/seeds/data/addresses-data';

import type { Business } from '../../../../lib/database/types/business';
import type { User } from '../../../../lib/database/types/user';
import type { Service } from '../../../../lib/database/types/service';

import { DateUtils } from '../../../../utils/date-utils';

describe('BookingsRepository - Pricing Logic Tests', () => {
  let bookingsRepository: BookingsRepository;
  let bookingSeeder: BookingSeeder;
  let businessSeeder: BusinessSeeder;
  let userSeeder: UserSeeder;
  let authUserSeeder: AuthUserSeeder;
  let serviceSeeder: ServiceSeeder;

  const testBusinesses: Record<string, Business> = {};
  const testUsers: Record<string, User> = {};
  const testServices: Record<string, Service> = {};

  beforeAll(async () => {
    bookingsRepository = new BookingsRepository();
    bookingSeeder = new BookingSeeder();
    businessSeeder = new BusinessSeeder();
    authUserSeeder = new AuthUserSeeder();
    userSeeder = new UserSeeder(authUserSeeder);
    serviceSeeder = new ServiceSeeder();

    await bookingSeeder.cleanup();
    await serviceSeeder.cleanup();
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();

    // Create all business types
    testBusinesses.removalist = await businessSeeder.createBusinessWith(removalistBusinessData);
    testBusinesses.cleaning = await businessSeeder.createBusinessWith(cleaningBusinessData);
    testBusinesses.handyman = await businessSeeder.createBusinessWith(handymanBusinessData);
    testBusinesses.beauty = await businessSeeder.createBusinessWith(beautyBusinessData);

    // Create users for each business
    testUsers.removalist = await userSeeder.createUserWith(
      { ...adminProviderUserData, business_id: testBusinesses.removalist.id },
      { ...adminAuthUserData, email: 'removalist@test.com' }
    );
    testUsers.cleaning = await userSeeder.createUserWith(
      { ...adminProviderUserData, business_id: testBusinesses.cleaning.id },
      { ...adminAuthUserData, email: 'cleaning@test.com' }
    );
    testUsers.handyman = await userSeeder.createUserWith(
      { ...adminProviderUserData, business_id: testBusinesses.handyman.id },
      { ...adminAuthUserData, email: 'handyman@test.com' }
    );
    testUsers.beauty = await userSeeder.createUserWith(
      { ...adminProviderUserData, business_id: testBusinesses.beauty.id },
      { ...adminAuthUserData, email: 'beauty@test.com' }
    );

    // Create services for testing different pricing combinations
    testServices.removal = await serviceSeeder.createServiceWith({
      ...removalServiceData,
      business_id: testBusinesses.removalist.id
    });
    testServices.housecleaning = await serviceSeeder.createServiceWith({
      ...housecleaningServiceData,
      business_id: testBusinesses.cleaning.id
    });
    testServices.commercial = await serviceSeeder.createServiceWith({
      ...commercialCleaningServiceData,
      business_id: testBusinesses.cleaning.id
    });
    testServices.plumbing = await serviceSeeder.createServiceWith({
      ...plumbingServiceData,
      business_id: testBusinesses.handyman.id
    });
    testServices.electrical = await serviceSeeder.createServiceWith({
      ...electricalServiceData,
      business_id: testBusinesses.handyman.id
    });
    testServices.manicure = await serviceSeeder.createServiceWith({
      ...manicureServiceData,
      business_id: testBusinesses.beauty.id
    });
  });

  afterAll(async () => {
    await bookingSeeder.cleanup();
    await serviceSeeder.cleanup();
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();
  });

  describe('LABOR_PER_HOUR_PER_PERSON Pricing', () => {
    it('should calculate pricing for single person hourly work', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      
      const bookingInput = createBooking('singlePersonMove', testBusinesses.removalist, [testServices.removal], addressMappings.transport);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUsers.removalist.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(95); // $95/hour for 1 person
      expect(booking.total_estimate_time_in_minutes).toBeGreaterThanOrEqual(40);
    });

    it('should scale pricing with multiple people', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 25);
      
      // Test 1, 2, and 3 person teams
      const quantities = [1, 2, 3];
      const expectedRates = [95, 145, 185];

      for (let i = 0; i < quantities.length; i++) {
        const bookingInput = createBooking('teamMove', testBusinesses.removalist, [testServices.removal], addressMappings.transport);
        bookingInput.services[0].quantity = quantities[i];

        const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUsers.removalist.id,
          DateUtils.addMinutesUTC(startAt, i * 30)
        );

        expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(expectedRates[i]);
      }
    });

    it('should handle cleaning services with team scaling', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 26);
      
      // Test 1 and 2 cleaner scenarios
      const singleCleanerInput = createBooking('houseCleaning', testBusinesses.cleaning, [testServices.housecleaning], addressMappings.cleaning);
      const teamCleaningInput = createBooking('teamCleaning', testBusinesses.cleaning, [testServices.housecleaning], addressMappings.cleaning);

      const singleBooking = await bookingsRepository.createBookingWithServicesAndAddresses(
        singleCleanerInput,
        testUsers.cleaning.id,
        startAt
      );

      const teamBooking = await bookingsRepository.createBookingWithServicesAndAddresses(
        teamCleaningInput,
        testUsers.cleaning.id,
        DateUtils.addMinutesUTC(startAt, 30)
      );

      expect(singleBooking.price_breakdown.service_breakdowns[0].base_cost).toBe(45); // $45/hour single
      expect(teamBooking.price_breakdown.service_breakdowns[0].base_cost).toBe(80); // $80/hour team
    });
  });

  describe('TRAVEL_PER_KM Pricing', () => {
    it('should calculate travel costs per kilometer', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 27);
      
      const bookingInput = createBooking('houseCleaning', testBusinesses.cleaning, [testServices.housecleaning], addressMappings.cleaning);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUsers.cleaning.id,
        startAt
      );

      expect(booking).toBeDefined();
      const travelCost = booking.price_breakdown.service_breakdowns[0].travel_cost;
      expect(travelCost).toBeGreaterThan(0);
      // Travel should be multiple of $2.50/km
      expect(travelCost % 2.50).toBeCloseTo(0, 1);
    });
  });

  describe('TRAVEL_PER_MINUTE_PER_PERSON Pricing', () => {
    it('should calculate travel costs per minute scaled by people', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 28);
      
      const singlePersonInput = createBooking('singlePersonMove', testBusinesses.removalist, [testServices.removal], addressMappings.transport);
      const teamInput = createBooking('teamMove', testBusinesses.removalist, [testServices.removal], addressMappings.transport);

      const singleBooking = await bookingsRepository.createBookingWithServicesAndAddresses(
        singlePersonInput,
        testUsers.removalist.id,
        startAt
      );

      const teamBooking = await bookingsRepository.createBookingWithServicesAndAddresses(
        teamInput,
        testUsers.removalist.id,
        DateUtils.addMinutesUTC(startAt, 30)
      );

      const singleTravelCost = singleBooking.price_breakdown.service_breakdowns[0].travel_cost;
      const teamTravelCost = teamBooking.price_breakdown.service_breakdowns[0].travel_cost;

      expect(singleTravelCost).toBeGreaterThan(0);
      expect(teamTravelCost).toBeGreaterThan(singleTravelCost); // Should scale with team size
    });
  });

  describe('SERVICE_FIXED_PER_SERVICE Pricing', () => {
    it('should apply fixed pricing regardless of time', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 29);
      
      const bookingInput = createBooking('manicureAtHome', testBusinesses.beauty, [testServices.manicure], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUsers.beauty.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(60); // Fixed $60
      expect(booking.total_estimate_time_in_minutes).toBe(45); // Time estimate separate from pricing
    });

    it('should handle electrical work with fixed rates', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 30);
      
      const bookingInput = createBooking('electricalJob', testBusinesses.handyman, [testServices.electrical], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUsers.handyman.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(120); // Fixed $120
      expect(booking.total_estimate_time_in_minutes).toBe(90);
    });
  });

  describe('SERVICE_PER_SQM Pricing', () => {
    it('should calculate pricing per square meter with tiers', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 31);
      
      // Test different square meter quantities for commercial cleaning
      const testCases = [
        { sqm: 50, expectedRate: 3.50, tier: 'small' },
        { sqm: 200, expectedRate: 2.80, tier: 'medium' },
        { sqm: 800, expectedRate: 2.20, tier: 'large' }
      ];

      for (const testCase of testCases) {
        const bookingInput = createBooking('commercialCleaning', testBusinesses.cleaning, [testServices.commercial], addressMappings.cleaning);
        bookingInput.services[0].quantity = testCase.sqm;

        const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUsers.cleaning.id,
          DateUtils.addMinutesUTC(startAt, testCases.indexOf(testCase) * 30)
        );

        expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(testCase.expectedRate);
      }
    });
  });

  describe('LABOUR_PER_HOUR (without per person) Pricing', () => {
    it('should calculate hourly labor without scaling by people', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 32);
      
      const bookingInput = createBooking('plumbingJob', testBusinesses.handyman, [testServices.plumbing], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUsers.handyman.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Plumbing has call-out fee + hourly labor components
      const serviceBreakdown = booking.price_breakdown.service_breakdowns[0];
      expect(serviceBreakdown.base_cost).toBeGreaterThan(95); // Should include hourly rate
    });
  });

  describe('Tiered Pricing Systems', () => {
    it('should apply quantity-based tiers correctly', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 33);
      
      // Test removal service tiers: 1, 2, 3 people with different rates
      const tierTests = [
        { quantity: 1, expectedRate: 95 },
        { quantity: 2, expectedRate: 145 },
        { quantity: 3, expectedRate: 185 }
      ];

      for (const tier of tierTests) {
        const bookingInput = createBooking('teamMove', testBusinesses.removalist, [testServices.removal], addressMappings.transport);
        bookingInput.services[0].quantity = tier.quantity;

        const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUsers.removalist.id,
          DateUtils.addMinutesUTC(startAt, tierTests.indexOf(tier) * 20)
        );

        expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(tier.expectedRate);
      }
    });

    it('should apply duration-based efficiency in time estimates', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 34);
      
      // More people should complete jobs faster
      const singlePersonInput = createBooking('singlePersonMove', testBusinesses.removalist, [testServices.removal], addressMappings.transport);
      const teamInput = createBooking('teamMove', testBusinesses.removalist, [testServices.removal], addressMappings.transport);

      const singleBooking = await bookingsRepository.createBookingWithServicesAndAddresses(
        singlePersonInput,
        testUsers.removalist.id,
        startAt
      );

      const teamBooking = await bookingsRepository.createBookingWithServicesAndAddresses(
        teamInput,
        testUsers.removalist.id,
        DateUtils.addMinutesUTC(startAt, 30)
      );

      // Team should complete faster
      expect(teamBooking.total_estimate_time_in_minutes).toBeLessThanOrEqual(
        singleBooking.total_estimate_time_in_minutes
      );
    });

    it('should handle volume discounts for large commercial spaces', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 35);
      
      // Large spaces get better per-sqm rates
      const smallSpaceInput = createBooking('commercialCleaning', testBusinesses.cleaning, [testServices.commercial], addressMappings.cleaning);
      smallSpaceInput.services[0].quantity = 50; // Small space

      const largeSpaceInput = createBooking('commercialCleaning', testBusinesses.cleaning, [testServices.commercial], addressMappings.cleaning);
      largeSpaceInput.services[0].quantity = 800; // Large space

      const smallBooking = await bookingsRepository.createBookingWithServicesAndAddresses(
        smallSpaceInput,
        testUsers.cleaning.id,
        startAt
      );

      const largeBooking = await bookingsRepository.createBookingWithServicesAndAddresses(
        largeSpaceInput,
        testUsers.cleaning.id,
        DateUtils.addMinutesUTC(startAt, 30)
      );

      // Large space should have better rate per sqm
      expect(largeBooking.price_breakdown.service_breakdowns[0].base_cost).toBeLessThan(
        smallBooking.price_breakdown.service_breakdowns[0].base_cost
      );
    });
  });

  describe('Multiple Component Pricing', () => {
    it('should combine multiple pricing components correctly', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 36);
      
      // Plumbing has both call-out fee and hourly labor
      const bookingInput = createBooking('plumbingJob', testBusinesses.handyman, [testServices.plumbing], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUsers.handyman.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Should include both components: $80 call-out + $95 labor
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBeGreaterThan(170);
    });

    it('should handle labor + travel combinations', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 37);
      
      // Removal service has both hourly labor and travel per minute
      const bookingInput = createBooking('teamMove', testBusinesses.removalist, [testServices.removal], addressMappings.transport);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUsers.removalist.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(145); // Labor component
      expect(booking.price_breakdown.service_breakdowns[0].travel_cost).toBeGreaterThan(0); // Travel component
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle minimum quantity edge cases', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 38);
      
      // Test with exactly min quantity
      const bookingInput = createBooking('houseCleaning', testBusinesses.cleaning, [testServices.housecleaning], addressMappings.cleaning);
      bookingInput.services[0].quantity = 1; // Exactly minimum

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUsers.cleaning.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(45);
    });

    it('should handle maximum quantity edge cases', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 39);
      
      // Test with max quantity for commercial cleaning
      const bookingInput = createBooking('commercialCleaning', testBusinesses.cleaning, [testServices.commercial], addressMappings.cleaning);
      bookingInput.services[0].quantity = 1000; // Max in largest tier

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUsers.cleaning.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(2.20); // Largest tier rate
    });

    it('should handle zero travel distance scenarios', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 40);
      
      // If business base is very close to customer, travel might be minimal
      const bookingInput = createBooking('manicureAtHome', testBusinesses.beauty, [testServices.manicure], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUsers.beauty.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Travel cost could be 0 or minimal for very close locations
      const travelCost = booking.price_breakdown.service_breakdowns[0].travel_cost;
      expect(travelCost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Pricing Validation and Consistency', () => {
    it('should maintain pricing consistency across similar services', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 41);
      
      // Book same service multiple times, should get consistent pricing
      const bookingInputs = [
        createBooking('manicureAtHome', testBusinesses.beauty, [testServices.manicure], addressMappings.beauty),
        createBooking('manicureAtHome', testBusinesses.beauty, [testServices.manicure], addressMappings.beauty)
      ];

      const bookings = [];
      for (let i = 0; i < bookingInputs.length; i++) {
        const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInputs[i],
          testUsers.beauty.id,
          DateUtils.addMinutesUTC(startAt, i * 30)
        );
        bookings.push(booking);
      }

      // Should have identical pricing
      expect(bookings[0].price_breakdown.service_breakdowns[0].base_cost).toBe(
        bookings[1].price_breakdown.service_breakdowns[0].base_cost
      );
    });

    it('should validate all pricing components sum correctly', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 42);
      
      const bookingInput = createBooking('teamMove', testBusinesses.removalist, [testServices.removal], addressMappings.transport);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUsers.removalist.id,
        startAt
      );

      expect(booking).toBeDefined();
      
      const serviceBreakdown = booking.price_breakdown.service_breakdowns[0];
      const businessFees = booking.price_breakdown.business_fees;
      
      // Verify breakdown components sum to total
      const serviceCost = serviceBreakdown.base_cost + serviceBreakdown.travel_cost;
      const totalFees = businessFees.gst_amount + businessFees.platform_fee_amount + businessFees.payment_processing_fee_amount;
      
      expect(serviceCost + totalFees).toBeCloseTo(booking.total_estimate_amount, 2);
    });
  });
});
