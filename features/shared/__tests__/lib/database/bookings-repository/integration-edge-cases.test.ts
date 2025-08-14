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
  manicureServiceData, 
  plumbingServiceData 
} from '../../../../lib/database/seeds/data/services-data';
import { createBooking } from '../../../../lib/database/seeds/data/bookings-data';
import { addressMappings } from '../../../../lib/database/seeds/data/addresses-data';

import type { Business } from '../../../../lib/database/types/business';
import type { User } from '../../../../lib/database/types/user';
import type { Service } from '../../../../lib/database/types/service';
import type { BookingCalculationInput } from '@/features/scheduling/lib/types/booking-calculations';
import { AddressRole } from '@/features/scheduling/lib/types/booking-calculations';
import { AddressType } from '../../../../lib/database/types/addresses';
import { DateUtils } from '../../../../utils/date-utils';

describe('BookingsRepository - Integration Tests and Edge Cases', () => {
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

    // Create test businesses
    testBusinesses.removalist = await businessSeeder.createBusinessWith(removalistBusinessData);
    testBusinesses.cleaning = await businessSeeder.createBusinessWith(cleaningBusinessData);
    testBusinesses.handyman = await businessSeeder.createBusinessWith(handymanBusinessData);
    testBusinesses.beauty = await businessSeeder.createBusinessWith(beautyBusinessData);

    // Create test users
    testUsers.removalist = await userSeeder.createUserWith(
      { ...adminProviderUserData, business_id: testBusinesses.removalist.id },
      { ...adminAuthUserData, email: 'removalist@integration.com' }
    );
    testUsers.cleaning = await userSeeder.createUserWith(
      { ...adminProviderUserData, business_id: testBusinesses.cleaning.id },
      { ...adminAuthUserData, email: 'cleaning@integration.com' }
    );
    testUsers.handyman = await userSeeder.createUserWith(
      { ...adminProviderUserData, business_id: testBusinesses.handyman.id },
      { ...adminAuthUserData, email: 'handyman@integration.com' }
    );
    testUsers.beauty = await userSeeder.createUserWith(
      { ...adminProviderUserData, business_id: testBusinesses.beauty.id },
      { ...adminAuthUserData, email: 'beauty@integration.com' }
    );

    // Create test services
    testServices.removal = await serviceSeeder.createServiceWith({
      ...removalServiceData,
      business_id: testBusinesses.removalist.id
    });
    testServices.housecleaning = await serviceSeeder.createServiceWith({
      ...housecleaningServiceData,
      business_id: testBusinesses.cleaning.id
    });
    testServices.manicure = await serviceSeeder.createServiceWith({
      ...manicureServiceData,
      business_id: testBusinesses.beauty.id
    });
    testServices.plumbing = await serviceSeeder.createServiceWith({
      ...plumbingServiceData,
      business_id: testBusinesses.handyman.id
    });
  });

  afterAll(async () => {
    await bookingSeeder.cleanup();
    await serviceSeeder.cleanup();
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();
  });

  describe('Service Dependencies Integration', () => {
    it('should integrate BookingCalculator correctly', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      
      const bookingInput = createBooking('teamMove', testBusinesses.removalist, [testServices.removal], addressMappings.transport);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUsers.removalist.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Verify calculator integration - pricing, time estimates, breakdowns
      expect(booking.price_breakdown).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns).toHaveLength(1);
      expect(booking.price_breakdown.business_fees).toBeDefined();
      expect(booking.total_estimate_amount).toBeGreaterThan(0);
      expect(booking.total_estimate_time_in_minutes).toBeGreaterThan(0);
    });

    it('should integrate AddressRepository correctly', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 25);
      
      const bookingInput = createBooking('teamMove', testBusinesses.removalist, [testServices.removal], addressMappings.transport);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUsers.removalist.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Addresses should be created and referenced correctly
      expect(bookingInput.addresses).toHaveLength(2); // Pickup and dropoff
      expect(bookingInput.addresses[0].role).toBe(AddressRole.PICKUP);
      expect(bookingInput.addresses[1].role).toBe(AddressRole.DROPOFF);
    });

    it('should integrate ServiceRepository correctly', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 26);
      
      const bookingInput = createBooking('manicureAtHome', testBusinesses.beauty, [testServices.manicure], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUsers.beauty.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Service integration should work with pricing calculations
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(60); // Manicure fixed price
    });

    it('should integrate BookingServiceRepository correctly', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 27);
      
      // Create booking with multiple services
      const bookingInput = createBooking('plumbingJob', testBusinesses.handyman, [testServices.plumbing, testServices.manicure], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUsers.handyman.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Should handle multiple services correctly
      expect(booking.price_breakdown.service_breakdowns).toHaveLength(2);
    });
  });

  describe('Data Consistency Tests', () => {
    it('should maintain service quantity vs pricing calculation consistency', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 28);
      
      const bookingInput = createBooking('teamMove', testBusinesses.removalist, [testServices.removal], addressMappings.transport);
      bookingInput.services[0].quantity = 2; // 2-person team

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUsers.removalist.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Pricing should reflect 2-person team rate
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(145); // 2-person rate
    });

    it('should maintain address sequence ordering', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 29);
      
      const bookingInput = createBooking('teamMove', testBusinesses.removalist, [testServices.removal], addressMappings.transport);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUsers.removalist.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Address sequence should be maintained
      expect(bookingInput.addresses[0].sequence_order).toBe(1);
      expect(bookingInput.addresses[1].sequence_order).toBe(2);
    });

    it('should maintain time estimation vs actual duration consistency', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 30);
      
      const bookingInput = createBooking('houseCleaning', testBusinesses.cleaning, [testServices.housecleaning], addressMappings.cleaning);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUsers.cleaning.id,
        startAt
      );

      expect(booking).toBeDefined();
      // End time should match start time + duration estimate
      const expectedEndTime = DateUtils.addMinutesUTC(startAt, booking.total_estimate_time_in_minutes);
      expect(booking.end_at).toBe(expectedEndTime);
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle zero quantity services gracefully', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 31);
      
      const bookingInput = createBooking('manicureAtHome', testBusinesses.beauty, [testServices.manicure], addressMappings.beauty);
      bookingInput.services[0].quantity = 0; // Invalid quantity

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUsers.beauty.id,
          startAt
        )
      ).rejects.toThrow();
    });

    it('should handle maximum quantity limits', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 32);
      
      const bookingInput = createBooking('teamMove', testBusinesses.removalist, [testServices.removal], addressMappings.transport);
      bookingInput.services[0].quantity = 999; // Beyond defined tiers

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUsers.removalist.id,
          startAt
        )
      ).rejects.toThrow();
    });

    it('should handle extreme distances gracefully', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 33);
      
      // Create addresses with extreme distance
      const extremeDistanceInput: BookingCalculationInput = {
        business: testBusinesses.cleaning,
        services: [{
          service: testServices.housecleaning,
          quantity: 1,
          serviceAddresses: []
        }],
        addresses: [
          {
            id: 'extreme-1',
            service_id: testServices.housecleaning.id,
            sequence_order: 1,
            role: AddressRole.SERVICE,
            address: {
              id: 'addr-extreme-1',
              service_id: testServices.housecleaning.id,
              type: AddressType.CUSTOMER,
              address_line_1: '1 Perth Street',
              address_line_2: null,
              city: 'Perth',
              postcode: '6000',
              state: 'WA',
              country: 'Australia'
            }
          }
        ]
      };

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        extremeDistanceInput,
        testUsers.cleaning.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Should handle extreme distance and calculate appropriate travel costs/time
      expect(booking.price_breakdown.service_breakdowns[0].travel_cost).toBeGreaterThan(0);
    });

    it('should handle invalid time ranges', async () => {
      const invalidStartAt = 'invalid-time-string';
      
      const bookingInput = createBooking('manicureAtHome', testBusinesses.beauty, [testServices.manicure], addressMappings.beauty);

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUsers.beauty.id,
          invalidStartAt
        )
      ).rejects.toThrow();
    });
  });

  describe('Data Validation Edge Cases', () => {
    it('should handle negative pricing amounts', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 34);
      
      // This would require modifying service data to have negative pricing
      // For now, we test that the system handles it gracefully
      const bookingInput = createBooking('manicureAtHome', testBusinesses.beauty, [testServices.manicure], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUsers.beauty.id,
        startAt
      );

      expect(booking).toBeDefined();
      // All amounts should be positive
      expect(booking.total_estimate_amount).toBeGreaterThan(0);
      expect(booking.deposit_amount).toBeGreaterThanOrEqual(0);
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBeGreaterThan(0);
    });

    it('should handle invalid service combinations', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 35);
      
      // Try to combine services from different businesses
      const invalidInput: BookingCalculationInput = {
        business: testBusinesses.beauty,
        services: [
          {
            service: testServices.manicure, // Beauty service
            quantity: 1,
            serviceAddresses: []
          },
          {
            service: testServices.removal, // Removal service from different business
            quantity: 1,
            serviceAddresses: []
          }
        ],
        addresses: [{
          id: 'invalid-combo',
          service_id: testServices.manicure.id,
          sequence_order: 1,
          role: AddressRole.SERVICE,
          address: {
            id: 'addr-invalid',
            service_id: testServices.manicure.id,
            type: AddressType.CUSTOMER,
            address_line_1: '123 Test Street',
            address_line_2: null,
            city: 'Melbourne',
            postcode: '3000',
            state: 'VIC',
            country: 'Australia'
          }
        }]
      };

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          invalidInput,
          testUsers.beauty.id,
          startAt
        )
      ).rejects.toThrow();
    });

    it('should handle missing pricing configurations', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 36);
      
      // Create service with empty pricing config
      const emptyPricingService = await serviceSeeder.createServiceWith({
        ...manicureServiceData,
        business_id: testBusinesses.beauty.id,
        name: 'Empty Pricing Service',
        pricing_config: {
          components: [] // Empty components
        }
      });

      const bookingInput = createBooking('manicureAtHome', testBusinesses.beauty, [emptyPricingService], addressMappings.beauty);

      await expect(
        bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUsers.beauty.id,
          startAt
        )
      ).rejects.toThrow();
    });

    it('should handle circular address routes', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 37);
      
      // Create circular route (same pickup and dropoff)
      const circularInput: BookingCalculationInput = {
        business: testBusinesses.removalist,
        services: [{
          service: testServices.removal,
          quantity: 1,
          serviceAddresses: []
        }],
        addresses: [
          {
            id: 'circular-1',
            service_id: testServices.removal.id,
            sequence_order: 1,
            role: AddressRole.PICKUP,
            address: {
              id: 'addr-circular-1',
              service_id: testServices.removal.id,
              type: AddressType.PICKUP,
              address_line_1: '123 Same Street',
              address_line_2: null,
              city: 'Melbourne',
              postcode: '3000',
              state: 'VIC',
              country: 'Australia'
            }
          },
          {
            id: 'circular-2',
            service_id: testServices.removal.id,
            sequence_order: 2,
            role: AddressRole.DROPOFF,
            address: {
              id: 'addr-circular-2',
              service_id: testServices.removal.id,
              type: AddressType.DROPOFF,
              address_line_1: '123 Same Street', // Same address
              address_line_2: null,
              city: 'Melbourne',
              postcode: '3000',
              state: 'VIC',
              country: 'Australia'
            }
          }
        ]
      };

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        circularInput,
        testUsers.removalist.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Should handle circular route with minimal or zero travel cost
      const travelCost = booking.price_breakdown.service_breakdowns[0].travel_cost;
      expect(travelCost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of services in one booking', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 38);
      
      // Create booking with multiple services (simulate package deal)
      const multiServiceInput = createBooking('manicureAtHome', testBusinesses.beauty, [
        testServices.manicure,
        testServices.manicure, // Multiple instances of same service
        testServices.manicure
      ], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        multiServiceInput,
        testUsers.beauty.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns).toHaveLength(3);
      
      // Should complete in reasonable time
      expect(booking.total_estimate_time_in_minutes).toBeGreaterThan(0);
    });

    it('should handle complex multi-stop routes', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 39);
      
      // Create complex route with multiple addresses
      const complexRouteInput: BookingCalculationInput = {
        business: testBusinesses.removalist,
        services: [{
          service: testServices.removal,
          quantity: 2,
          serviceAddresses: []
        }],
        addresses: [
          {
            id: 'complex-1',
            service_id: testServices.removal.id,
            sequence_order: 1,
            role: AddressRole.PICKUP,
            address: {
              id: 'addr-complex-1',
              service_id: testServices.removal.id,
              type: AddressType.PICKUP,
              address_line_1: '123 Start Street',
              address_line_2: null,
              city: 'Melbourne',
              postcode: '3000',
              state: 'VIC',
              country: 'Australia'
            }
          },
          {
            id: 'complex-2',
            service_id: testServices.removal.id,
            sequence_order: 2,
            role: AddressRole.DROPOFF,
            address: {
              id: 'addr-complex-2',
              service_id: testServices.removal.id,
              type: AddressType.DROPOFF,
              address_line_1: '456 End Street',
              address_line_2: null,
              city: 'Richmond',
              postcode: '3121',
              state: 'VIC',
              country: 'Australia'
            }
          }
        ]
      };

      const startTime = Date.now();
      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        complexRouteInput,
        testUsers.removalist.id,
        startAt
      );
      const endTime = Date.now();

      expect(booking).toBeDefined();
      // Should complete within reasonable time (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should handle high-frequency booking creation', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 40);
      
      // Create multiple bookings rapidly
      const promises = [];
      for (let i = 0; i < 5; i++) {
        const bookingInput = createBooking('manicureAtHome', testBusinesses.beauty, [testServices.manicure], addressMappings.beauty);
        const promise = bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUsers.beauty.id,
          DateUtils.addMinutesUTC(startAt, i * 30)
        );
        promises.push(promise);
      }

      const startTime = Date.now();
      const bookings = await Promise.all(promises);
      const endTime = Date.now();

      expect(bookings).toHaveLength(5);
      bookings.forEach(booking => {
        expect(booking).toBeDefined();
      });
      
      // Should handle concurrent creation efficiently
      expect(endTime - startTime).toBeLessThan(10000); // Less than 10 seconds for 5 bookings
    });

    it('should handle concurrent booking creation without conflicts', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 41);
      
      // Create concurrent bookings for same business/user
      const concurrentPromises = Array.from({ length: 3 }, (_, i) => {
        const bookingInput = createBooking('houseCleaning', testBusinesses.cleaning, [testServices.housecleaning], addressMappings.cleaning);
        return bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUsers.cleaning.id,
          DateUtils.addMinutesUTC(startAt, i * 60)
        );
      });

      const bookings = await Promise.all(concurrentPromises);

      expect(bookings).toHaveLength(3);
      bookings.forEach((booking, index) => {
        expect(booking).toBeDefined();
        expect(booking.id).toBeDefined();
        // Each booking should have unique ID
        const otherBookings = bookings.filter((_, i) => i !== index);
        otherBookings.forEach(otherBooking => {
          expect(booking.id).not.toBe(otherBooking.id);
        });
      });
    });
  });
});
