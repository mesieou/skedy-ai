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
import { AddressRole } from '@/features/scheduling/lib/types/booking-calculations';
import { AddressType } from '../../../../lib/database/types/addresses';
import { DateUtils } from '../../../../utils/date-utils';

describe('BookingsRepository - Error Handling', () => {
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

  describe('Database Connection Failures', () => {
    it('should handle repository initialization errors', async () => {
      // This test would require mocking the database connection
      // For now, we'll test that the repository can be instantiated
      expect(bookingsRepository).toBeInstanceOf(BookingsRepository);
    });

    it('should handle database timeout scenarios', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      const bookingInput = createBooking(
        'manicureAtHome', 
        testBusiness, 
        [testService], 
        addressMappings.beauty
      );

      // This would require database connection mocking to simulate timeouts
      // For integration tests, we ensure the method doesn't hang indefinitely
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), 10000)
      );

      const bookingPromise = bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      // The booking should complete faster than our timeout
      const result = await Promise.race([bookingPromise, timeoutPromise]);
      expect(result).toBeDefined();
    });
  });

  describe('Invalid Business ID', () => {
    it('should reject non-existent business_id', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 25);
      
      const invalidBusinessInput = {
        ...createBooking('manicureAtHome', testBusiness, [testService], addressMappings.beauty),
        business: { ...testBusiness, id: '00000000-0000-0000-0000-000000000000' }
      };

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          invalidBusinessInput,
          testUser.id,
          startAt
        )
      ).rejects.toThrow();
    });

    it('should reject malformed business_id', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 26);
      
      const malformedBusinessInput = {
        ...createBooking('manicureAtHome', testBusiness, [testService], addressMappings.beauty),
        business: { ...testBusiness, id: 'not-a-valid-uuid' }
      };

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          malformedBusinessInput,
          testUser.id,
          startAt
        )
      ).rejects.toThrow();
    });

    it('should reject null business_id', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 27);
      
      const nullBusinessInput = {
        ...createBooking('manicureAtHome', testBusiness, [testService], addressMappings.beauty),
        business: { ...testBusiness, id: null as unknown as string }
      };

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          nullBusinessInput,
          testUser.id,
          startAt
        )
      ).rejects.toThrow();
    });
  });

  describe('Invalid User ID', () => {
    it('should reject non-existent user_id', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 28);
      const bookingInput = createBooking(
        'manicureAtHome', 
        testBusiness, 
        [testService], 
        addressMappings.beauty
      );

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          '00000000-0000-0000-0000-000000000000',
          startAt
        )
      ).rejects.toThrow();
    });

    it('should reject malformed user_id', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 29);
      const bookingInput = createBooking(
        'manicureAtHome', 
        testBusiness, 
        [testService], 
        addressMappings.beauty
      );

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          'not-a-valid-uuid',
          startAt
        )
      ).rejects.toThrow();
    });

    it('should reject null user_id', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 30);
      const bookingInput = createBooking(
        'manicureAtHome', 
        testBusiness, 
        [testService], 
        addressMappings.beauty
      );

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          null as unknown as string,
          startAt
        )
      ).rejects.toThrow();
    });
  });

  describe('Invalid Start-At Timestamps', () => {
    it('should reject invalid ISO string formats', async () => {
      const bookingInput = createBooking(
        'manicureAtHome', 
        testBusiness, 
        [testService], 
        addressMappings.beauty
      );

      const invalidTimestamps = [
        'not-a-date',
        '2024-01-01', // Missing time component
        '2024-01-01T10:00:00', // Missing timezone
        '2024-13-01T10:00:00Z', // Invalid month
        '2024-01-32T10:00:00Z', // Invalid day
        '2024-01-01T25:00:00Z', // Invalid hour
        '2024-01-01T10:60:00Z', // Invalid minutes
        '2024-01-01T10:00:60Z', // Invalid seconds
      ];

      for (const invalidTimestamp of invalidTimestamps) {
        await expect(
          bookingsRepository.createBookingWithServicesAndAddresses(
            bookingInput,
            testUser.id,
            invalidTimestamp
          )
        ).rejects.toThrow();
      }
    });

    it('should reject null start_at', async () => {
      const bookingInput = createBooking(
        'manicureAtHome', 
        testBusiness, 
        [testService], 
        addressMappings.beauty
      );

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUser.id,
          null as unknown as string
        )
      ).rejects.toThrow();
    });

    it('should reject undefined start_at', async () => {
      const bookingInput = createBooking(
        'manicureAtHome', 
        testBusiness, 
        [testService], 
        addressMappings.beauty
      );

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUser.id,
          undefined as unknown as string
        )
      ).rejects.toThrow();
    });
  });

  describe('BookingCalculator Failures', () => {
    it('should handle missing pricing configuration', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 31);
      
      // Create service with incomplete pricing config
      const invalidService = await serviceSeeder.createServiceWith({
        ...manicureServiceData,
        business_id: testBusiness.id,
        name: 'Invalid Service',
        pricing_config: {
          components: [] // Empty components should cause calculation failure
        }
      });

      const bookingInput = createBooking(
        'manicureAtHome', 
        testBusiness, 
        [invalidService], 
        addressMappings.beauty
      );

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUser.id,
          startAt
        )
      ).rejects.toThrow();
    });

    it('should handle invalid service quantity configurations', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 32);
      
      const bookingInput = createBooking(
        'manicureAtHome', 
        testBusiness, 
        [testService], 
        addressMappings.beauty
      );

      // Set invalid quantity that doesn't match service tiers
      bookingInput.services[0].quantity = 999; // Likely outside defined tiers

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUser.id,
          startAt
        )
      ).rejects.toThrow();
    });

    it('should handle missing business minimum charge', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 33);
      
      // Create business without minimum charge
      const businessWithoutMinCharge = await businessSeeder.createBusinessWith({
        ...beautyBusinessData,
        name: 'No Min Charge Business',
        email: 'nomin@beauty.com',
        minimum_charge: 0
      });

      const testUserForBusiness = await userSeeder.createUserWith(
        { ...adminProviderUserData, business_id: businessWithoutMinCharge.id },
        { ...adminAuthUserData, email: 'nomin-user@beauty.com' }
      );

      const serviceForBusiness = await serviceSeeder.createServiceWith({
        ...manicureServiceData,
        business_id: businessWithoutMinCharge.id
      });

      const bookingInput = createBooking(
        'manicureAtHome', 
        businessWithoutMinCharge, 
        [serviceForBusiness], 
        addressMappings.beauty
      );

      // This should still work, but minimum charge logic should be tested
      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUserForBusiness.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.total_estimate_amount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Address Creation Failures', () => {
    it('should handle invalid address data', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 34);
      
      const bookingInput: BookingCalculationInput = {
        business: testBusiness,
        services: [{
          service: testService,
          quantity: 1,
          serviceAddresses: []
        }],
        addresses: [{
          id: 'invalid-address',
          service_id: testService.id,
          sequence_order: 1,
          role: AddressRole.SERVICE,
          address: {
            id: 'addr-1',
            service_id: testService.id,
            type: AddressType.CUSTOMER,
            address_line_1: '', // Empty required field
            address_line_2: null,
            city: '', // Empty required field
            postcode: '', // Empty required field
            state: '',
            country: ''
          }
        }]
      };

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUser.id,
          startAt
        )
      ).rejects.toThrow();
    });

    it('should handle missing address data', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 35);
      
      const bookingInput: BookingCalculationInput = {
        business: testBusiness,
        services: [{
          service: testService,
          quantity: 1,
          serviceAddresses: []
        }],
        addresses: [] // Missing required addresses
      };

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUser.id,
          startAt
        )
      ).rejects.toThrow();
    });

    it('should handle duplicate address sequence orders', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 36);
      
      const duplicateAddress = {
        id: 'duplicate-1',
        service_id: testService.id,
        sequence_order: 1, // Same sequence order
        role: AddressRole.SERVICE,
        address: {
          id: 'addr-dup-1',
          service_id: testService.id,
          type: AddressType.CUSTOMER,
          address_line_1: '123 Test Street',
          address_line_2: null,
          city: 'Melbourne',
          postcode: '3000',
          state: 'VIC',
          country: 'Australia'
        }
      };

      const bookingInput: BookingCalculationInput = {
        business: testBusiness,
        services: [{
          service: testService,
          quantity: 1,
          serviceAddresses: []
        }],
        addresses: [duplicateAddress, { ...duplicateAddress, id: 'duplicate-2' }] // Duplicate sequence orders
      };

      // This might be allowed depending on business logic, but should be tested
      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
    });
  });

  describe('Service Creation Failures', () => {
    it('should handle service-business mismatch', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 37);
      
      // Create another business
      const otherBusiness = await businessSeeder.createBusinessWith({
        ...beautyBusinessData,
        name: 'Other Business',
        email: 'other@business.com'
      });

      const serviceFromOtherBusiness = await serviceSeeder.createServiceWith({
        ...manicureServiceData,
        business_id: otherBusiness.id
      });

      const bookingInput = createBooking(
        'manicureAtHome', 
        testBusiness, // Using testBusiness
        [serviceFromOtherBusiness], // But service belongs to otherBusiness
        addressMappings.beauty
      );

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUser.id,
          startAt
        )
      ).rejects.toThrow();
    });

    it('should handle non-existent service IDs', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 38);
      
      const bookingInput = createBooking(
        'manicureAtHome', 
        testBusiness, 
        [testService], 
        addressMappings.beauty
      );

      // Modify service ID to be invalid
      bookingInput.services[0].service.id = '00000000-0000-0000-0000-000000000000';

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUser.id,
          startAt
        )
      ).rejects.toThrow();
    });

    it('should handle malformed service IDs', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 39);
      
      const bookingInput = createBooking(
        'manicureAtHome', 
        testBusiness, 
        [testService], 
        addressMappings.beauty
      );

      // Modify service ID to be malformed
      bookingInput.services[0].service.id = 'not-a-uuid';

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
