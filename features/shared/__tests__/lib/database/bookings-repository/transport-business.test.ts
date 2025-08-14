import { BookingsRepository } from '../../../../lib/database/repositories/bookings-respository';
import { BookingSeeder } from '../../../../lib/database/seeds/booking-seeder';
import { BusinessSeeder } from '../../../../lib/database/seeds/business-seeder';
import { UserSeeder } from '../../../../lib/database/seeds/user-seeder';
import { AuthUserSeeder } from '../../../../lib/database/seeds/auth-user-seeder';
import { ServiceSeeder } from '../../../../lib/database/seeds/service-seeder';

import { removalistBusinessData } from '../../../../lib/database/seeds/data/business-data';
import { adminProviderUserData } from '../../../../lib/database/seeds/data/user-data';
import { adminAuthUserData } from '../../../../lib/database/seeds/data/auth-user-data';
import { removalServiceData } from '../../../../lib/database/seeds/data/services-data';
import { createBooking } from '../../../../lib/database/seeds/data/bookings-data';
import { addressMappings } from '../../../../lib/database/seeds/data/addresses-data';

import type { Business } from '../../../../lib/database/types/business';
import type { User } from '../../../../lib/database/types/user';
import type { Service } from '../../../../lib/database/types/service';
import { AddressRole } from '@/features/scheduling/lib/types/booking-calculations';

import { DateUtils } from '../../../../utils/date-utils';

describe('BookingsRepository - Transport/Removals Business', () => {
  let bookingsRepository: BookingsRepository;
  let bookingSeeder: BookingSeeder;
  let businessSeeder: BusinessSeeder;
  let userSeeder: UserSeeder;
  let authUserSeeder: AuthUserSeeder;
  let serviceSeeder: ServiceSeeder;

  let removalistBusiness: Business;
  let testUser: User;
  let removalService: Service;

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

    // Create removalist business with fixed deposit and GST
    removalistBusiness = await businessSeeder.createBusinessWith(removalistBusinessData);
    
    testUser = await userSeeder.createUserWith(
      { ...adminProviderUserData, business_id: removalistBusiness.id },
      adminAuthUserData
    );

    removalService = await serviceSeeder.createServiceWith({
      ...removalServiceData,
      business_id: removalistBusiness.id
    });
  });

  afterAll(async () => {
    await bookingSeeder.cleanup();
    await serviceSeeder.cleanup();
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();
  });

  describe('Single Person Moves', () => {
    it('should create booking for single person move', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      
      const bookingInput = createBooking('singlePersonMove', removalistBusiness, [removalService], addressMappings.transport);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.total_estimate_amount).toBeGreaterThan(removalistBusiness.minimum_charge);
      // Removalist business has fixed $100 deposit
      expect(booking.deposit_amount).toBe(100);
      expect(booking.price_breakdown.business_fees.gst_amount).toBeGreaterThan(0); // GST enabled
      expect(booking.price_breakdown.service_breakdowns).toHaveLength(1);
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(95); // $95/hour for 1 person
      expect(booking.total_estimate_time_in_minutes).toBeGreaterThanOrEqual(40); // Minimum time estimate
    });

    it('should calculate travel costs between pickup and dropoff', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 25);
      
      const bookingInput = createBooking('singlePersonMove', removalistBusiness, [removalService], addressMappings.transport);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Should include travel cost component for distance between locations
      const travelCost = booking.price_breakdown.service_breakdowns[0].travel_cost;
      expect(travelCost).toBeGreaterThan(0);
      expect(booking.total_estimate_time_in_minutes).toBeGreaterThan(40); // Includes travel time
    });
  });

  describe('Team Moves', () => {
    it('should create booking for 2-person team move', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 26);
      
      const bookingInput = createBooking('teamMove', removalistBusiness, [removalService], addressMappings.transport);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(145); // $145/hour for 2 people
      expect(booking.total_estimate_time_in_minutes).toBeLessThan(60); // Faster with team
      expect(booking.total_estimate_amount).toBeGreaterThan(removalistBusiness.minimum_charge);
    });

    it('should create booking for 3-person large move', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 27);
      
      const bookingInput = createBooking('largeMove', removalistBusiness, [removalService], addressMappings.transport);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(185); // $185/hour for 3 people
      expect(booking.total_estimate_time_in_minutes).toBeLessThan(90); // Fastest with 3 people
      expect(booking.total_estimate_amount).toBeGreaterThan(removalistBusiness.minimum_charge);
    });
  });

  describe('Different Move Types', () => {
    it('should handle small item moves with appropriate pricing', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 28);
      
      const bookingInput = createBooking('smallItemMove', removalistBusiness, [removalService], addressMappings.transport);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(145); // 2-person team
      expect(booking.total_estimate_time_in_minutes).toBeGreaterThanOrEqual(30); // Quick move
      expect(booking.total_estimate_amount).toBeGreaterThanOrEqual(removalistBusiness.minimum_charge);
    });

    it('should handle long distance moves with increased travel costs', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 29);
      
      const bookingInput = createBooking('longDistanceMove', removalistBusiness, [removalService], addressMappings.transport);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns[0].travel_cost).toBeGreaterThan(50); // Higher travel cost
      expect(booking.total_estimate_time_in_minutes).toBeGreaterThan(120); // Includes significant travel time
      expect(booking.total_estimate_amount).toBeGreaterThan(removalistBusiness.minimum_charge * 2);
    });
  });

  describe('Pricing Model Validation', () => {
    it('should apply hourly rate per person correctly', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 30);
      
      // Test all three quantity tiers
      const quantities = [1, 2, 3];
      const expectedRates = [95, 145, 185];

      for (let i = 0; i < quantities.length; i++) {
        const bookingInput = createBooking('singlePersonMove', removalistBusiness, [removalService], addressMappings.transport);
        bookingInput.services[0].quantity = quantities[i];

        const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUser.id,
          DateUtils.addMinutesUTC(startAt, i * 60)
        );

        expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(expectedRates[i]);
      }
    });

    it('should include travel costs per minute per person', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 31);
      
      const bookingInput = createBooking('teamMove', removalistBusiness, [removalService], addressMappings.transport);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Travel cost should scale with number of people
      const travelCost = booking.price_breakdown.service_breakdowns[0].travel_cost;
      expect(travelCost).toBeGreaterThan(0);
      
      // For 2 people, travel cost should be roughly double single person
      const singlePersonBooking = createBooking('singlePersonMove', removalistBusiness, [removalService], addressMappings.transport);
      const singleBooking = await bookingsRepository.createBookingWithServicesAndAddresses(
        singlePersonBooking,
        testUser.id,
        DateUtils.addMinutesUTC(startAt, 30)
      );

      const singleTravelCost = singleBooking.price_breakdown.service_breakdowns[0].travel_cost;
      expect(travelCost).toBeGreaterThan(singleTravelCost);
    });

    it('should respect minimum charges', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 32);
      
      // Create a very short move that would be below minimum
      const bookingInput = createBooking('smallItemMove', removalistBusiness, [removalService], addressMappings.transport);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.total_estimate_amount).toBeGreaterThanOrEqual(removalistBusiness.minimum_charge);
    });
  });

  describe('Business Configuration', () => {
    it('should apply fixed deposit amount correctly', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 33);
      
      const bookingInput = createBooking('teamMove', removalistBusiness, [removalService], addressMappings.transport);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.deposit_amount).toBe(100); // Fixed $100 deposit
      expect(booking.remaining_balance).toBe(booking.total_estimate_amount - 100);
    });

    it('should apply GST correctly', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 34);
      
      const bookingInput = createBooking('largeMove', removalistBusiness, [removalService], addressMappings.transport);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.business_fees.gst_amount).toBeGreaterThan(0);
      expect(booking.price_breakdown.business_fees.gst_rate).toBe(10); // 10% GST
    });

    it('should apply platform and payment processing fees', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 35);
      
      const bookingInput = createBooking('singlePersonMove', removalistBusiness, [removalService], addressMappings.transport);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.business_fees.platform_fee_amount).toBeGreaterThan(0);
      expect(booking.price_breakdown.business_fees.payment_processing_fee_amount).toBeGreaterThan(0);
      
      // Platform fee should be 2% of subtotal
      expect(booking.price_breakdown.business_fees.platform_fee_percentage).toBe(2);
      // Payment processing fee should be 2.9%
      expect(booking.price_breakdown.business_fees.payment_processing_fee_percentage).toBe(2.9);
    });
  });

  describe('Travel Charging Models', () => {
    it('should charge travel between customer locations only', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 36);
      
      // The removal service uses BETWEEN_CUSTOMER_LOCATIONS model
      const bookingInput = createBooking('teamMove', removalistBusiness, [removalService], addressMappings.transport);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Should only include travel between pickup and dropoff locations
      const travelCost = booking.price_breakdown.service_breakdowns[0].travel_cost;
      expect(travelCost).toBeGreaterThan(0);
      
      // Verify the booking has pickup and dropoff addresses
      expect(bookingInput.addresses).toHaveLength(2);
      expect(bookingInput.addresses.some(addr => addr.role === AddressRole.PICKUP)).toBe(true);
      expect(bookingInput.addresses.some(addr => addr.role === AddressRole.DROPOFF)).toBe(true);
    });
  });

  describe('Volume-Based Pricing Scenarios', () => {
    it('should handle room-based estimates for house moves', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 37);
      
      const bookingInput = createBooking('largeMove', removalistBusiness, [removalService], addressMappings.transport);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Large moves should have longer time estimates
      expect(booking.total_estimate_time_in_minutes).toBeGreaterThanOrEqual(60);
      expect(booking.total_estimate_amount).toBeGreaterThan(300); // Should be substantial for large move
    });

    it('should handle apartment vs house move pricing differences', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 38);
      
      // Compare small item move (apartment-like) vs large move (house-like)
      const smallMoveInput = createBooking('smallItemMove', removalistBusiness, [removalService], addressMappings.transport);
      const largeMoveInput = createBooking('largeMove', removalistBusiness, [removalService], addressMappings.transport);

      const smallBooking = await bookingsRepository.createBookingWithServicesAndAddresses(
        smallMoveInput,
        testUser.id,
        startAt
      );

      const largeBooking = await bookingsRepository.createBookingWithServicesAndAddresses(
        largeMoveInput,
        testUser.id,
        DateUtils.addMinutesUTC(startAt, 60)
      );

      expect(smallBooking).toBeDefined();
      expect(largeBooking).toBeDefined();
      
      // Large move should take more time and cost more
      expect(largeBooking.total_estimate_time_in_minutes).toBeGreaterThan(smallBooking.total_estimate_time_in_minutes);
      expect(largeBooking.total_estimate_amount).toBeGreaterThan(smallBooking.total_estimate_amount);
    });
  });

  describe('Multiple Vehicle Types', () => {
    it('should handle different team sizes as vehicle capacity', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 39);
      
      // Test progression from 1 person (small van) to 3 people (large truck)
      const teamSizes = [1, 2, 3];
      const bookings = [];

      for (let i = 0; i < teamSizes.length; i++) {
        const bookingInput = createBooking('teamMove', removalistBusiness, [removalService], addressMappings.transport);
        bookingInput.services[0].quantity = teamSizes[i];

        const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          testUser.id,
          DateUtils.addMinutesUTC(startAt, i * 30)
        );

        bookings.push(booking);
      }

      // Larger teams should cost more per hour but complete jobs faster
      expect(bookings[1].price_breakdown.service_breakdowns[0].base_cost).toBeGreaterThan(
        bookings[0].price_breakdown.service_breakdowns[0].base_cost
      );
      expect(bookings[2].price_breakdown.service_breakdowns[0].base_cost).toBeGreaterThan(
        bookings[1].price_breakdown.service_breakdowns[0].base_cost
      );

      // But time estimates should decrease
      expect(bookings[1].total_estimate_time_in_minutes).toBeLessThanOrEqual(
        bookings[0].total_estimate_time_in_minutes
      );
      expect(bookings[2].total_estimate_time_in_minutes).toBeLessThanOrEqual(
        bookings[1].total_estimate_time_in_minutes
      );
    });
  });
});
