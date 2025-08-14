import { BookingsRepository } from '../../../../lib/database/repositories/bookings-respository';
import { BookingSeeder } from '../../../../lib/database/seeds/booking-seeder';
import { BusinessSeeder } from '../../../../lib/database/seeds/business-seeder';
import { UserSeeder } from '../../../../lib/database/seeds/user-seeder';
import { AuthUserSeeder } from '../../../../lib/database/seeds/auth-user-seeder';
import { ServiceSeeder } from '../../../../lib/database/seeds/service-seeder';

import { beautyBusinessData } from '../../../../lib/database/seeds/data/business-data';
import { adminProviderUserData } from '../../../../lib/database/seeds/data/user-data';
import { adminAuthUserData } from '../../../../lib/database/seeds/data/auth-user-data';
import { manicureServiceData, pedicureServiceData, massageServiceData } from '../../../../lib/database/seeds/data/services-data';
import { createBooking } from '../../../../lib/database/seeds/data/bookings-data';
import { addressMappings } from '../../../../lib/database/seeds/data/addresses-data';

import type { Business } from '../../../../lib/database/types/business';
import type { User } from '../../../../lib/database/types/user';
import type { Service } from '../../../../lib/database/types/service';

import { DateUtils } from '../../../../utils/date-utils';

describe('BookingsRepository - Beauty Business', () => {
  let bookingsRepository: BookingsRepository;
  let bookingSeeder: BookingSeeder;
  let businessSeeder: BusinessSeeder;
  let userSeeder: UserSeeder;
  let authUserSeeder: AuthUserSeeder;
  let serviceSeeder: ServiceSeeder;

  let beautyBusiness: Business;
  let testUser: User;
  let manicureService: Service;
  let pedicureService: Service;
  let massageService: Service;

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

    // Create beauty business with percentage deposit and no GST
    beautyBusiness = await businessSeeder.createBusinessWith(beautyBusinessData);
    
    testUser = await userSeeder.createUserWith(
      { ...adminProviderUserData, business_id: beautyBusiness.id },
      adminAuthUserData
    );

    manicureService = await serviceSeeder.createServiceWith({
      ...manicureServiceData,
      business_id: beautyBusiness.id
    });

    pedicureService = await serviceSeeder.createServiceWith({
      ...pedicureServiceData,
      business_id: beautyBusiness.id
    });

    massageService = await serviceSeeder.createServiceWith({
      ...massageServiceData,
      business_id: beautyBusiness.id
    });
  });

  afterAll(async () => {
    await bookingSeeder.cleanup();
    await serviceSeeder.cleanup();
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();
  });

  describe('Single Service Bookings', () => {
    it('should create booking for manicure service', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      
      const bookingInput = createBooking('manicureAtHome', beautyBusiness, [manicureService], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.total_estimate_amount).toBeGreaterThan(beautyBusiness.minimum_charge);
      // Beauty business has 50% percentage deposit
      expect(booking.deposit_amount).toBeCloseTo(booking.total_estimate_amount * 0.5, 2);
      expect(booking.price_breakdown.business_fees.gst_amount).toBe(0); // No GST for beauty business
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(60); // Fixed $60 for manicure
      expect(booking.total_estimate_time_in_minutes).toBeGreaterThanOrEqual(45); // 45+ minutes for manicure
    });

    it('should create booking for pedicure service', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 25);
      
      const bookingInput = createBooking('pedicureAtHome', beautyBusiness, [pedicureService], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(90); // Fixed $90 for pedicure
      expect(booking.total_estimate_time_in_minutes).toBeGreaterThanOrEqual(60); // 60+ minutes for pedicure
      expect(booking.deposit_amount).toBeCloseTo(booking.total_estimate_amount * 0.5, 2);
    });

    it('should create booking for massage service with travel costs', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 26);
      
      const bookingInput = createBooking('massageWithTravel', beautyBusiness, [massageService], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns[0].base_cost).toBe(120); // Fixed $120 for massage
      expect(booking.price_breakdown.service_breakdowns[0].travel_cost).toBeGreaterThan(0); // Travel per minute
      expect(booking.total_estimate_time_in_minutes).toBeGreaterThan(60); // Includes travel time
    });
  });

  describe('Package Service Bookings', () => {
    it('should create booking for manicure + pedicure package', async () => {
      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 27);
      
      const bookingInput = createBooking('beautyPackage', beautyBusiness, [manicureService, pedicureService], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        testUser.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.service_breakdowns).toHaveLength(2);
      // Total should be manicure ($60) + pedicure ($90) + fees
      const totalServiceCost = booking.price_breakdown.service_breakdowns.reduce(
        (sum, breakdown) => sum + breakdown.total_cost, 0
      );
      expect(totalServiceCost).toBe(150);
      expect(booking.total_estimate_time_in_minutes).toBeGreaterThanOrEqual(105); // 45 + 60+ minutes
    });
  });
});
