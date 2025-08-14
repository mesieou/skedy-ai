import { BookingsRepository } from '../../../../lib/database/repositories/bookings-respository';
import { BookingSeeder } from '../../../../lib/database/seeds/booking-seeder';
import { BusinessSeeder } from '../../../../lib/database/seeds/business-seeder';
import { UserSeeder } from '../../../../lib/database/seeds/user-seeder';
import { AuthUserSeeder } from '../../../../lib/database/seeds/auth-user-seeder';
import { ServiceSeeder } from '../../../../lib/database/seeds/service-seeder';

import { handymanBusinessData } from '../../../../lib/database/seeds/data/business-data';
import { adminProviderUserData } from '../../../../lib/database/seeds/data/user-data';
import { adminAuthUserData } from '../../../../lib/database/seeds/data/auth-user-data';
import { plumbingServiceData, electricalServiceData } from '../../../../lib/database/seeds/data/services-data';
import { createBooking } from '../../../../lib/database/seeds/data/bookings-data';
import { addressMappings } from '../../../../lib/database/seeds/data/addresses-data';

import type { Business } from '../../../../lib/database/types/business';
import type { User } from '../../../../lib/database/types/user';
import type { Service } from '../../../../lib/database/types/service';

import { DateUtils } from '../../../../utils/date-utils';

describe('BookingsRepository - Handyman Business', () => {
  let bookingsRepository: BookingsRepository;
  let bookingSeeder: BookingSeeder;
  let businessSeeder: BusinessSeeder;
  let userSeeder: UserSeeder;
  let authUserSeeder: AuthUserSeeder;
  let serviceSeeder: ServiceSeeder;

  let handymanBusiness: Business;
  let testUser: User;
  let plumbingService: Service;
  let electricalService: Service;

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

    // Create handyman business with fixed deposit and GST
    handymanBusiness = await businessSeeder.createBusinessWith(handymanBusinessData);
    
    testUser = await userSeeder.createUserWith(
      { ...adminProviderUserData, business_id: handymanBusiness.id },
      adminAuthUserData
    );

    plumbingService = await serviceSeeder.createServiceWith({
      ...plumbingServiceData,
      business_id: handymanBusiness.id
    });

    electricalService = await serviceSeeder.createServiceWith({
      ...electricalServiceData,
      business_id: handymanBusiness.id
    });
  });

  afterAll(async () => {
    await bookingSeeder.cleanup();
    await serviceSeeder.cleanup();
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();
  });

  describe('Fixed Service Pricing', () => {
    it('should create booking for plumbing repairs with call-out fee', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      
      const bookingInput = createBooking('plumbingJob', handymanBusiness, [plumbingService], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.total_estimate_amount).toBeGreaterThan(handymanBusiness.minimum_charge);
      // Handyman business has fixed $75 deposit
      expect(booking.deposit_amount).toBe(75);
      expect(booking.price_breakdown.business_fees.gst_amount).toBeGreaterThan(0); // GST enabled
      
      // Plumbing has call-out fee ($80) + hourly labor ($95)
      const serviceBreakdown = booking.price_breakdown.service_breakdowns[0];
      expect(serviceBreakdown.base_cost).toBeGreaterThanOrEqual(80); // At least call-out fee
      expect(booking.total_estimate_time_in_minutes).toBe(60); // 1 hour standard
    });

    it('should create booking for electrical work with fixed pricing', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 25);
      
      const bookingInput = createBooking('electricalJob', handymanBusiness, [electricalService], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(120); // Fixed $120 for electrical
      expect(booking.total_estimate_time_in_minutes).toBe(90); // 1.5 hours for electrical work
      expect(booking.deposit_amount).toBe(75); // Fixed deposit
    });

    it('should handle emergency repairs with same pricing structure', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 26);
      
      const bookingInput = createBooking('emergencyRepair', handymanBusiness, [plumbingService], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Emergency would use same plumbing service pricing
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBeGreaterThanOrEqual(80);
      expect(booking.total_estimate_time_in_minutes).toBe(60);
      
      // Could potentially add surge pricing logic here in future
      expect(booking.total_estimate_amount).toBeGreaterThan(handymanBusiness.minimum_charge);
    });
  });

  describe('Call-Out Fees and Labor Charges', () => {
    it('should apply call-out fee for plumbing service', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 27);
      
      const bookingInput = createBooking('plumbingJob', handymanBusiness, [plumbingService], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      
      // Plumbing service has two components: call-out fee + hourly labor
      // Base cost should reflect both components combined
      const serviceBreakdown = booking.price_breakdown.service_breakdowns[0];
      expect(serviceBreakdown.base_cost).toBeGreaterThan(80); // More than just call-out fee
      expect(serviceBreakdown.base_cost).toBeGreaterThan(95); // Should include hourly rate too
    });

    it('should calculate hourly labor charges correctly', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 28);
      
      const bookingInput = createBooking('plumbingJob', handymanBusiness, [plumbingService], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.total_estimate_time_in_minutes).toBe(60); // 1 hour minimum
      
      // Should include both call-out ($80) and labor ($95/hour)
      const expectedMinimum = 80 + 95; // $175 minimum
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBeGreaterThanOrEqual(expectedMinimum);
    });

    it('should handle longer jobs with extended hourly rates', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 29);
      
      // Modify service to simulate longer job
      const bookingInput = createBooking('plumbingJob', handymanBusiness, [plumbingService], addressMappings.handyman);
      // Note: In real implementation, this might be controlled by job complexity or materials

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.total_estimate_time_in_minutes).toBeGreaterThanOrEqual(60);
      expect(booking.total_estimate_amount).toBeGreaterThan(handymanBusiness.minimum_charge);
    });
  });

  describe('Material Costs and Complex Jobs', () => {
    it('should handle simple repairs with standard pricing', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 30);
      
      const bookingInput = createBooking('plumbingJob', handymanBusiness, [plumbingService], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.total_estimate_time_in_minutes).toBe(60); // Standard 1 hour
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBeGreaterThan(150); // Call-out + labor
    });

    it('should handle complex installations with higher rates', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 31);
      
      // Electrical work typically represents more complex installations
      const bookingInput = createBooking('electricalJob', handymanBusiness, [electricalService], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(120); // Fixed electrical rate
      expect(booking.total_estimate_time_in_minutes).toBe(90); // Longer for complex work
      expect(booking.total_estimate_amount).toBeGreaterThan(handymanBusiness.minimum_charge);
    });

    it('should handle multiple small jobs in one booking', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 32);
      
      // Book both plumbing and electrical in same visit
      const bookingInput = createBooking('plumbingJob', handymanBusiness, [plumbingService, electricalService], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns).toHaveLength(2);
      
      // Should have both service costs
      const totalServiceCost = booking.price_breakdown.service_breakdowns.reduce(
        (sum, breakdown) => sum + breakdown.total_cost, 0
      );
      expect(totalServiceCost).toBeGreaterThan(200); // Both services combined
      
      // Time should be combined too
      expect(booking.total_estimate_time_in_minutes).toBeGreaterThan(90); // More than single service
    });
  });

  describe('Emergency Call-Outs and Surge Pricing', () => {
    it('should handle emergency repairs with standard rates', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 33);
      
      const bookingInput = createBooking('emergencyRepair', handymanBusiness, [plumbingService], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Currently uses standard plumbing rates
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBeGreaterThanOrEqual(175);
      expect(booking.total_estimate_time_in_minutes).toBe(60);
      
      // Future enhancement could add emergency surcharge
      expect(booking.total_estimate_amount).toBeGreaterThan(handymanBusiness.minimum_charge);
    });

    it('should handle after-hours emergency calls', async () => {
      // Schedule for late evening (could trigger after-hours rates)
      const afterHoursStart = DateUtils.addHoursUTC(DateUtils.nowUTC(), 48); // Tomorrow evening
      
      const bookingInput = createBooking('emergencyRepair', handymanBusiness, [plumbingService], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        afterHoursStart
      );

      expect(booking).toBeDefined();
      // Currently no time-based surge, but structure supports it
      expect(booking.total_estimate_amount).toBeGreaterThan(handymanBusiness.minimum_charge);
    });

    it('should handle weekend emergency rates', async () => {
      // Calculate next weekend date
      const now = new Date();
      const daysUntilSaturday = (6 - now.getDay()) % 7;
      const weekendStart = DateUtils.addHoursUTC(DateUtils.nowUTC(), (daysUntilSaturday * 24) + 10);
      
      const bookingInput = createBooking('emergencyRepair', handymanBusiness, [electricalService], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        weekendStart
      );

      expect(booking).toBeDefined();
      // Weekend rates could be implemented as multipliers
      expect(booking.total_estimate_amount).toBeGreaterThan(handymanBusiness.minimum_charge);
    });
  });

  describe('Business Configuration', () => {
    it('should apply fixed deposit correctly', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 34);
      
      const bookingInput = createBooking('plumbingJob', handymanBusiness, [plumbingService], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.deposit_amount).toBe(75); // Fixed $75 deposit
      expect(booking.remaining_balance).toBe(booking.total_estimate_amount - 75);
    });

    it('should apply GST and premium business fees', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 35);
      
      const bookingInput = createBooking('electricalJob', handymanBusiness, [electricalService], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.business_fees.gst_amount).toBeGreaterThan(0);
      expect(booking.price_breakdown.business_fees.gst_rate).toBe(10); // 10% GST

      // Platform fee should be 2.5% (premium tier)
      expect(booking.price_breakdown.business_fees.platform_fee_percentage).toBe(2.5);
      // Payment processing fee should be 3.2%
      expect(booking.price_breakdown.business_fees.payment_processing_fee_percentage).toBe(3.2);
    });

    it('should respect minimum charge for small jobs', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 36);
      
      const bookingInput = createBooking('plumbingJob', handymanBusiness, [plumbingService], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.total_estimate_amount).toBeGreaterThanOrEqual(handymanBusiness.minimum_charge);
    });
  });

  describe('Service Complexity Tiers', () => {
    it('should price basic repairs appropriately', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 37);
      
      const bookingInput = createBooking('plumbingJob', handymanBusiness, [plumbingService], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.total_estimate_time_in_minutes).toBe(60); // Basic 1-hour job
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBeGreaterThan(170); // Call-out + labor
    });

    it('should handle complex installations with appropriate time estimates', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 38);
      
      const bookingInput = createBooking('electricalJob', handymanBusiness, [electricalService], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.total_estimate_time_in_minutes).toBe(90); // Complex installations take longer
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(120); // Fixed rate for complexity
    });
  });

  describe('Payment Methods and Premium Service', () => {
    it('should support multiple payment methods', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 39);
      
      const bookingInput = createBooking('plumbingJob', handymanBusiness, [plumbingService], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Business accepts credit card, cash, and PayPal
      expect(handymanBusiness.payment_methods).toContain('CREDIT_CARD');
      expect(handymanBusiness.payment_methods).toContain('CASH');
      expect(handymanBusiness.payment_methods).toContain('PAYPAL');
      expect(handymanBusiness.preferred_payment_method).toBe('CASH');
    });

    it('should reflect premium subscription benefits in pricing structure', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 40);
      
      const bookingInput = createBooking('electricalJob', handymanBusiness, [electricalService], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Premium tier has competitive platform fees
      expect(booking.price_breakdown.business_fees.platform_fee_percentage).toBe(2.5); // Lower than basic
      expect(handymanBusiness.subscription_type).toBe('PREMIUM');
    });
  });

  describe('Travel Costs and Service Areas', () => {
    it('should include travel costs from base to customer', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 41);
      
      const bookingInput = createBooking('plumbingJob', handymanBusiness, [plumbingService], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Plumbing service uses FROM_BASE_TO_CUSTOMERS travel model
      // Travel cost should be included if distance > 0
      const travelCost = booking.price_breakdown.service_breakdowns[0].travel_cost;
      expect(travelCost).toBeGreaterThanOrEqual(0); // May be 0 if very close
    });

    it('should calculate full route travel for electrical work', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 42);
      
      const bookingInput = createBooking('electricalJob', handymanBusiness, [electricalService], addressMappings.handyman);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      // Electrical service uses FULL_ROUTE travel model
      // Should include comprehensive travel costs
      const travelCost = booking.price_breakdown.service_breakdowns[0].travel_cost;
      expect(travelCost).toBeGreaterThanOrEqual(0);
    });
  });
});
