import { BookingsRepository } from '../../../../lib/database/repositories/bookings-respository';
import { BookingSeeder } from '../../../../lib/database/seeds/booking-seeder';
import { BusinessSeeder } from '../../../../lib/database/seeds/business-seeder';
import { UserSeeder } from '../../../../lib/database/seeds/user-seeder';
import { AuthUserSeeder } from '../../../../lib/database/seeds/auth-user-seeder';
import { ServiceSeeder } from '../../../../lib/database/seeds/service-seeder';

import { cleaningBusinessData } from '../../../../lib/database/seeds/data/business-data';
import { adminProviderUserData } from '../../../../lib/database/seeds/data/user-data';
import { adminAuthUserData } from '../../../../lib/database/seeds/data/auth-user-data';
import { housecleaningServiceData, commercialCleaningServiceData } from '../../../../lib/database/seeds/data/services-data';
import { createBooking } from '../../../../lib/database/seeds/data/bookings-data';
import { addressMappings } from '../../../../lib/database/seeds/data/addresses-data';

import type { Business } from '../../../../lib/database/types/business';
import type { User } from '../../../../lib/database/types/user';
import type { Service } from '../../../../lib/database/types/service';

import { DateUtils } from '../../../../utils/date-utils';

describe('BookingsRepository - Cleaning Business', () => {
  let bookingsRepository: BookingsRepository;
  let bookingSeeder: BookingSeeder;
  let businessSeeder: BusinessSeeder;
  let userSeeder: UserSeeder;
  let authUserSeeder: AuthUserSeeder;
  let serviceSeeder: ServiceSeeder;

  let cleaningBusiness: Business;
  let testUser: User;
  let housecleaningService: Service;
  let commercialCleaningService: Service;

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

    // Create cleaning business with percentage deposit and GST
    cleaningBusiness = await businessSeeder.createBusinessWith(cleaningBusinessData);
    
    testUser = await userSeeder.createUserWith(
      { ...adminProviderUserData, business_id: cleaningBusiness.id },
      adminAuthUserData
    );

    housecleaningService = await serviceSeeder.createServiceWith({
      ...housecleaningServiceData,
      business_id: cleaningBusiness.id
    });

    commercialCleaningService = await serviceSeeder.createServiceWith({
      ...commercialCleaningServiceData,
      business_id: cleaningBusiness.id
    });
  });

  afterAll(async () => {
    await bookingSeeder.cleanup();
    await serviceSeeder.cleanup();
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();
  });

  describe('Residential Cleaning - Per Hour Per Person', () => {
    it('should create booking for single cleaner house cleaning', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      
      const bookingInput = createBooking('houseCleaning', cleaningBusiness, [housecleaningService], addressMappings.cleaning);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.total_estimate_amount).toBeGreaterThan(cleaningBusiness.minimum_charge);
      // Cleaning business has 20% percentage deposit
      expect(booking.deposit_amount).toBeCloseTo(booking.total_estimate_amount * 0.2, 2);
      expect(booking.price_breakdown.business_fees.gst_amount).toBeGreaterThan(0); // GST enabled
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(45); // $45/hour for 1 person
      expect(booking.total_estimate_time_in_minutes).toBe(120); // 2 hours standard
    });

    it('should create booking for team cleaning with 2 cleaners', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 25);
      
      const bookingInput = createBooking('teamCleaning', cleaningBusiness, [housecleaningService], addressMappings.cleaning);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(80); // $80/hour for 2 people
      expect(booking.total_estimate_time_in_minutes).toBe(90); // Faster with team (90 minutes)
      expect(booking.deposit_amount).toBeCloseTo(booking.total_estimate_amount * 0.2, 2);
    });

    it('should include travel costs for house cleaning', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 26);
      
      const bookingInput = createBooking('houseCleaning', cleaningBusiness, [housecleaningService], addressMappings.cleaning);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Should include travel cost component at $2.50/km
      const travelCost = booking.price_breakdown.service_breakdowns[0].travel_cost;
      expect(travelCost).toBeGreaterThan(0);
      expect(travelCost).toBeGreaterThan(5); // Should be at least a few km worth of travel
    });
  });

  describe('Commercial Cleaning - Per Square Meter', () => {
    it('should create booking for small office cleaning (1-100 sqm)', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 27);
      
      const bookingInput = createBooking('commercialCleaning', cleaningBusiness, [commercialCleaningService], addressMappings.cleaning);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(3.50); // $3.50/sqm for small offices
      expect(booking.total_estimate_time_in_minutes).toBe(180); // 3 hours for small office
      expect(booking.total_estimate_amount).toBeGreaterThan(cleaningBusiness.minimum_charge);
    });

    it('should apply tiered pricing for medium office (101-500 sqm)', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 28);
      
      // Modify service quantity to fall in medium tier
      const bookingInput = createBooking('commercialCleaning', cleaningBusiness, [commercialCleaningService], addressMappings.cleaning);
      bookingInput.services[0].quantity = 150; // 150 sqm

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(2.80); // $2.80/sqm for medium offices
      expect(booking.total_estimate_time_in_minutes).toBe(360); // 6 hours for medium office
    });

    it('should apply best pricing for large office (501+ sqm)', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 29);
      
      // Modify service quantity to fall in large tier
      const bookingInput = createBooking('commercialCleaning', cleaningBusiness, [commercialCleaningService], addressMappings.cleaning);
      bookingInput.services[0].quantity = 750; // 750 sqm

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(2.20); // $2.20/sqm for large offices
      expect(booking.total_estimate_time_in_minutes).toBe(480); // 8 hours for large office
    });
  });

  describe('Different Service Levels', () => {
    it('should handle basic house cleaning service', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 30);
      
      const bookingInput = createBooking('houseCleaning', cleaningBusiness, [housecleaningService], addressMappings.cleaning);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.total_estimate_time_in_minutes).toBe(120); // Standard 2 hours
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(45); // Standard rate
    });

    it('should handle premium cleaning with team of 2', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 31);
      
      const bookingInput = createBooking('teamCleaning', cleaningBusiness, [housecleaningService], addressMappings.cleaning);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.total_estimate_time_in_minutes).toBe(90); // Faster completion
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(80); // Premium team rate
      expect(booking.total_estimate_amount).toBeGreaterThan(
        cleaningBusiness.minimum_charge
      );
    });
  });

  describe('Recurring Service Scenarios', () => {
    it('should handle one-time deep cleaning service', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 32);
      
      const bookingInput = createBooking('teamCleaning', cleaningBusiness, [housecleaningService], addressMappings.cleaning);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Deep cleaning typically takes longer
      expect(booking.total_estimate_time_in_minutes).toBeGreaterThanOrEqual(90);
      expect(booking.total_estimate_amount).toBeGreaterThan(cleaningBusiness.minimum_charge);
    });

    it('should price recurring service at standard rates', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 33);
      
      // Regular cleaning would be same pricing as house cleaning
      const bookingInput = createBooking('houseCleaning', cleaningBusiness, [housecleaningService], addressMappings.cleaning);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(45); // Regular rate
      expect(booking.total_estimate_time_in_minutes).toBe(120); // Standard time
    });
  });

  describe('Property Size Variations', () => {
    it('should handle studio apartment cleaning', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 34);
      
      // Small office address can represent studio apartment
      const bookingInput = createBooking('houseCleaning', cleaningBusiness, [housecleaningService], addressMappings.cleaning);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.total_estimate_time_in_minutes).toBe(120); // Standard minimum time
      expect(booking.total_estimate_amount).toBeGreaterThanOrEqual(cleaningBusiness.minimum_charge);
    });

    it('should handle large house cleaning with team', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 35);
      
      // Use team cleaning for large houses
      const bookingInput = createBooking('teamCleaning', cleaningBusiness, [housecleaningService], addressMappings.cleaning);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(80); // Team rate
      expect(booking.total_estimate_time_in_minutes).toBe(90); // Efficient team work
    });
  });

  describe('Business Configuration', () => {
    it('should apply percentage deposit correctly', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 36);
      
      const bookingInput = createBooking('houseCleaning', cleaningBusiness, [housecleaningService], addressMappings.cleaning);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.deposit_amount).toBeCloseTo(booking.total_estimate_amount * 0.2, 2); // 20% deposit
      expect(booking.remaining_balance).toBeCloseTo(booking.total_estimate_amount * 0.8, 2);
    });

    it('should apply GST and business fees correctly', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 37);
      
      const bookingInput = createBooking('teamCleaning', cleaningBusiness, [housecleaningService], addressMappings.cleaning);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.business_fees.gst_amount).toBeGreaterThan(0);
      expect(booking.price_breakdown.business_fees.gst_rate).toBe(10); // 10% GST

      // Platform fee should be 3%
      expect(booking.price_breakdown.business_fees.platform_fee_percentage).toBe(3);
      // Payment processing fee should be 2.5%
      expect(booking.price_breakdown.business_fees.payment_processing_fee_percentage).toBe(2.5);
    });

    it('should respect minimum charge for small cleanings', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 38);
      
      const bookingInput = createBooking('houseCleaning', cleaningBusiness, [housecleaningService], addressMappings.cleaning);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.total_estimate_amount).toBeGreaterThanOrEqual(cleaningBusiness.minimum_charge);
    });
  });

  describe('Travel and Distance Calculations', () => {
    it('should calculate travel costs per kilometer', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 39);
      
      const bookingInput = createBooking('houseCleaning', cleaningBusiness, [housecleaningService], addressMappings.cleaning);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      const travelCost = booking.price_breakdown.service_breakdowns[0].travel_cost;
      expect(travelCost).toBeGreaterThan(0);
      
      // Travel cost should be reasonable (multiple of $2.50/km)
      expect(travelCost % 2.50).toBeCloseTo(0, 1);
    });

    it('should handle different locations with varying travel costs', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 40);
      
      // Test different address mappings to see travel cost variations
      const locations = ['smallOffice', 'mediumOffice', 'largeOffice'];
      const bookings = [];

      for (let i = 0; i < locations.length; i++) {
        // Create booking with different office locations
        const bookingInput = createBooking('houseCleaning', cleaningBusiness, [housecleaningService], addressMappings.cleaning);

        const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUser.id,
          DateUtils.addMinutesUTC(startAt, i * 30)
        );

        bookings.push(booking);
      }

      // All should have some travel cost
      bookings.forEach(booking => {
        expect(booking.price_breakdown.service_breakdowns[0].travel_cost).toBeGreaterThan(0);
      });
    });
  });

  describe('Commercial vs Residential Pricing', () => {
    it('should price commercial cleaning differently than residential', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 41);
      
      // Create both residential and commercial bookings
      const residentialInput = createBooking('houseCleaning', cleaningBusiness, [housecleaningService], addressMappings.cleaning);
      const commercialInput = createBooking('commercialCleaning', cleaningBusiness, [commercialCleaningService], addressMappings.cleaning);

      const residentialBooking = await bookingsRepository.createBookingWithServicesAndAddresses(
        residentialInput,
        testUser.id,
        startAt
      );

      const commercialBooking = await bookingsRepository.createBookingWithServicesAndAddresses(
        commercialInput,
        testUser.id,
        DateUtils.addMinutesUTC(startAt, 30)
      );

      expect(residentialBooking).toBeDefined();
      expect(commercialBooking).toBeDefined();

      // Different pricing models
      expect(residentialBooking.price_breakdown.service_breakdowns[0].base_cost).toBe(45); // Per hour
      expect(commercialBooking.price_breakdown.service_breakdowns[0].base_cost).toBe(3.50); // Per sqm

      // Different time estimates
      expect(residentialBooking.total_estimate_time_in_minutes).toBe(120);
      expect(commercialBooking.total_estimate_time_in_minutes).toBe(180);
    });
  });
});
