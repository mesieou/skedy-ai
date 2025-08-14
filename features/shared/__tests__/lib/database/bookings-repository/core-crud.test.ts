import { BookingsRepository } from '../../../../lib/database/repositories/bookings-respository';
import { BookingSeeder } from '../../../../lib/database/seeds/booking-seeder';
import { BusinessSeeder } from '../../../../lib/database/seeds/business-seeder';
import { UserSeeder } from '../../../../lib/database/seeds/user-seeder';
import { AuthUserSeeder } from '../../../../lib/database/seeds/auth-user-seeder';
import { ServiceSeeder } from '../../../../lib/database/seeds/service-seeder';

import { beautyBusinessData } from '../../../../lib/database/seeds/data/business-data';
import { adminProviderUserData } from '../../../../lib/database/seeds/data/user-data';
import { adminAuthUserData } from '../../../../lib/database/seeds/data/auth-user-data';
import { manicureServiceData } from '../../../../lib/database/seeds/data/services-data';
import { createBooking } from '../../../../lib/database/seeds/data/bookings-data';
import { addressMappings } from '../../../../lib/database/seeds/data/addresses-data';

import type { Business } from '../../../../lib/database/types/business';
import type { User } from '../../../../lib/database/types/user';
import type { Service } from '../../../../lib/database/types/service';
import type { BookingCalculationInput } from '@/features/scheduling/lib/types/booking-calculations';

import { DateUtils } from '../../../../utils/date-utils';

describe('BookingsRepository - Core CRUD Operations', () => {
  let bookingsRepository: BookingsRepository;
  let bookingSeeder: BookingSeeder;
  let businessSeeder: BusinessSeeder;
  let userSeeder: UserSeeder;
  let authUserSeeder: AuthUserSeeder;
  let serviceSeeder: ServiceSeeder;

  let testBusiness: Business;
  let testUser: User;
  let testService: Service;

  beforeAll(async () => {
    bookingsRepository = new BookingsRepository();
    bookingSeeder = new BookingSeeder();
    businessSeeder = new BusinessSeeder();
    authUserSeeder = new AuthUserSeeder();
    userSeeder = new UserSeeder(authUserSeeder);
    serviceSeeder = new ServiceSeeder();

    // Cleanup existing data
    await bookingSeeder.cleanup();
    await serviceSeeder.cleanup();
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();

    // Setup test data
    testBusiness = await businessSeeder.createBusinessWith(beautyBusinessData);
    testUser = await userSeeder.createUserWith(
      { ...adminProviderUserData, business_id: testBusiness.id },
      adminAuthUserData
    );
    testService = await serviceSeeder.createServiceWith({
      ...manicureServiceData,
      business_id: testBusiness.id
    });
  });

  afterAll(async () => {
    await bookingSeeder.cleanup();
    await serviceSeeder.cleanup();
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();
  });

  describe('Basic CRUD Operations', () => {
    it('should create booking with minimal data', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      
      const minimalBookingInput = createBooking(
        'manicureAtHome', 
        testBusiness, 
        [testService], 
        addressMappings.beauty
      );

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        minimalBookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.id).toBeDefined();
      expect(booking.user_id).toBe(testUser.id);
      expect(booking.business_id).toBe(testBusiness.id);
      expect(booking.start_at).toBe(startAt);
      expect(booking.total_estimate_amount).toBeGreaterThan(0);
      expect(booking.total_estimate_time_in_minutes).toBeGreaterThan(0);
      expect(booking.deposit_amount).toBeGreaterThan(0);
      expect(booking.price_breakdown).toBeDefined();
      expect(booking.created_at).toBeDefined();
      expect(booking.updated_at).toBeDefined();
    });

    it('should create booking with all optional fields', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 25);
      
      const fullBookingInput = createBooking(
        'beautyPackage', 
        testBusiness, 
        [testService], 
        addressMappings.beauty
      );

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        fullBookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.end_at).toBeDefined();
      expect(booking.remaining_balance).toBeDefined();
      expect(booking.deposit_paid).toBe(false);
      expect(booking.price_breakdown.business_fees).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns.length).toBeGreaterThan(0);
    });

    it('should handle invalid input data gracefully', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 26);
      
      const invalidBookingInput: BookingCalculationInput = {
        business: testBusiness,
        services: [], // Empty services array should cause error
        addresses: []
      };

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          invalidBookingInput,
          testUser.id,
          startAt
        )
      ).rejects.toThrow();
    });

    it('should handle missing required fields', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 27);
      
      const bookingInputMissingFields = createBooking(
        'manicureAtHome', 
        testBusiness, 
        [testService], 
        addressMappings.beauty
      );

      // Test with invalid user_id
      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInputMissingFields,
          '', // Empty user_id should cause error
          startAt
        )
      ).rejects.toThrow();

      // Test with invalid start_at
      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInputMissingFields,
          testUser.id,
          '' // Empty start_at should cause error
        )
      ).rejects.toThrow();
    });
  });

  describe('Data Validation', () => {
    it('should validate business_id exists', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 28);
      
      const invalidBusinessInput = {
        ...createBooking('manicureAtHome', testBusiness, [testService], addressMappings.beauty),
        business: { ...testBusiness, id: 'invalid-business-id' }
      };

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          invalidBusinessInput,
          testUser.id,
          startAt
        )
      ).rejects.toThrow();
    });

    it('should validate user_id exists', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 29);
      
      const validBookingInput = createBooking(
        'manicureAtHome', 
        testBusiness, 
        [testService], 
        addressMappings.beauty
      );

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          validBookingInput,
          'invalid-user-id',
          startAt
        )
      ).rejects.toThrow();
    });

    it('should validate start_at timestamp format', async () => {
      const validBookingInput = createBooking(
        'manicureAtHome', 
        testBusiness, 
        [testService], 
        addressMappings.beauty
      );

      // Test invalid timestamp formats
      const invalidTimestamps = [
        'invalid-date',
        '2024-13-01T10:00:00Z', // Invalid month
        '2024-01-32T10:00:00Z', // Invalid day
        '2024-01-01T25:00:00Z', // Invalid hour
        'not-a-date'
      ];

      for (const invalidTimestamp of invalidTimestamps) {
        await expect(
          bookingsRepository.createBookingWithServicesAndAddresses(
            validBookingInput,
            testUser.id,
            invalidTimestamp
          )
        ).rejects.toThrow();
      }
    });

    it('should validate past timestamps', async () => {
      const pastDate = DateUtils.addHoursUTC(DateUtils.nowUTC(), -24); // 24 hours ago
      
      const validBookingInput = createBooking(
        'manicureAtHome', 
        testBusiness, 
        [testService], 
        addressMappings.beauty
      );

      // Should allow past dates for testing purposes, but may have business logic validation
      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        validBookingInput,
        testUser.id,
        pastDate
      );

      expect(booking).toBeDefined();
      expect(booking.start_at).toBe(pastDate);
    });
  });

  describe('Service Validation', () => {
    it('should validate service belongs to business', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 30);
      
      // Create a service for a different business
      const otherBusiness = await businessSeeder.createBusinessWith({
        ...beautyBusinessData,
        name: 'Other Beauty Business',
        email: 'other@beauty.com'
      });
      
      const otherService = await serviceSeeder.createServiceWith({
        ...manicureServiceData,
        business_id: otherBusiness.id,
        name: 'Other Service'
      });

      const invalidServiceInput = createBooking(
        'manicureAtHome', 
        testBusiness, // Using testBusiness
        [otherService], // But service belongs to otherBusiness
        addressMappings.beauty
      );

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          invalidServiceInput,
          testUser.id,
          startAt
        )
      ).rejects.toThrow();
    });

    it('should validate service quantities are positive', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 31);
      
      const bookingInput = createBooking(
        'manicureAtHome', 
        testBusiness, 
        [testService], 
        addressMappings.beauty
      );

      // Modify quantity to be invalid
      bookingInput.services[0].quantity = 0;

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUser.id,
          startAt
        )
      ).rejects.toThrow();

      // Test negative quantity
      bookingInput.services[0].quantity = -1;

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUser.id,
          startAt
        )
      ).rejects.toThrow();
    });
  });
});
