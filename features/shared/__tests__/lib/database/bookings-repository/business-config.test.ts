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
import { manicureServiceData } from '../../../../lib/database/seeds/data/services-data';
import { createBooking } from '../../../../lib/database/seeds/data/bookings-data';
import { addressMappings } from '../../../../lib/database/seeds/data/addresses-data';
import { SubscriptionType, PaymentMethod, DepositType } from '../../../../lib/database/types/business';
import { DateUtils } from '../../../../utils/date-utils';

describe('BookingsRepository - Business Configuration Tests', () => {
  let bookingsRepository: BookingsRepository;
  let bookingSeeder: BookingSeeder;
  let businessSeeder: BusinessSeeder;
  let userSeeder: UserSeeder;
  let authUserSeeder: AuthUserSeeder;
  let serviceSeeder: ServiceSeeder;

  beforeEach(async () => {
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
  });

  afterEach(async () => {
    await bookingSeeder.cleanup();
    await serviceSeeder.cleanup();
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();
  });

  describe('GST Fee Structures', () => {
    it('should apply 10% GST correctly', async () => {
      const business = await businessSeeder.createBusinessWith({
        ...removalistBusinessData,
        gst_rate: 10.00,
        charges_gst: true
      });
      
      const user = await userSeeder.createUserWith(
        { ...adminProviderUserData, business_id: business.id },
        adminAuthUserData
      );

      const service = await serviceSeeder.createServiceWith({
        ...manicureServiceData,
        business_id: business.id
      });

      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      const bookingInput = createBooking('manicureAtHome', business, [service], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        user.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.business_fees.gst_rate).toBe(10);
      expect(booking.price_breakdown.business_fees.gst_amount).toBeGreaterThan(0);
      
      // GST should be 10% of subtotal
      const subtotal = booking.price_breakdown.service_breakdowns.reduce(
        (sum, breakdown) => sum + breakdown.total_cost, 0
      );
      const expectedGST = subtotal * 0.10;
      expect(booking.price_breakdown.business_fees.gst_amount).toBeCloseTo(expectedGST, 2);
    });

    it('should apply 15% GST correctly', async () => {
      const business = await businessSeeder.createBusinessWith({
        ...cleaningBusinessData,
        gst_rate: 15.00,
        charges_gst: true
      });
      
      const user = await userSeeder.createUserWith(
        { ...adminProviderUserData, business_id: business.id },
        { ...adminAuthUserData, email: 'gst15@test.com' }
      );

      const service = await serviceSeeder.createServiceWith({
        ...manicureServiceData,
        business_id: business.id
      });

      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      const bookingInput = createBooking('manicureAtHome', business, [service], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        user.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.business_fees.gst_rate).toBe(15);
      expect(booking.price_breakdown.business_fees.gst_amount).toBeGreaterThan(0);
    });

    it('should apply 20% GST correctly', async () => {
      const business = await businessSeeder.createBusinessWith({
        ...handymanBusinessData,
        gst_rate: 20.00,
        charges_gst: true
      });
      
      const user = await userSeeder.createUserWith(
        { ...adminProviderUserData, business_id: business.id },
        { ...adminAuthUserData, email: 'gst20@test.com' }
      );

      const service = await serviceSeeder.createServiceWith({
        ...manicureServiceData,
        business_id: business.id
      });

      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      const bookingInput = createBooking('manicureAtHome', business, [service], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        user.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.business_fees.gst_rate).toBe(20);
      expect(booking.price_breakdown.business_fees.gst_amount).toBeGreaterThan(0);
    });

    it('should not charge GST for exempt businesses', async () => {
      const business = await businessSeeder.createBusinessWith({
        ...beautyBusinessData,
        charges_gst: false,
        gst_rate: 0.00
      });
      
      const user = await userSeeder.createUserWith(
        { ...adminProviderUserData, business_id: business.id },
        { ...adminAuthUserData, email: 'nogst@test.com' }
      );

      const service = await serviceSeeder.createServiceWith({
        ...manicureServiceData,
        business_id: business.id
      });

      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      const bookingInput = createBooking('manicureAtHome', business, [service], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        user.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.business_fees.gst_amount).toBe(0);
      expect(booking.price_breakdown.business_fees.gst_rate).toBe(0);
    });
  });

  describe('Platform and Payment Processing Fees', () => {
    it('should apply 1% platform fee correctly', async () => {
      const business = await businessSeeder.createBusinessWith({
        ...beautyBusinessData,
        booking_platform_fee_percentage: 1.0
      });
      
      const user = await userSeeder.createUserWith(
        { ...adminProviderUserData, business_id: business.id },
        { ...adminAuthUserData, email: 'platform1@test.com' }
      );

      const service = await serviceSeeder.createServiceWith({
        ...manicureServiceData,
        business_id: business.id
      });

      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      const bookingInput = createBooking('manicureAtHome', business, [service], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        user.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.business_fees.platform_fee_percentage).toBe(1);
      expect(booking.price_breakdown.business_fees.platform_fee_amount).toBeGreaterThan(0);
    });

    it('should apply 5% platform fee correctly', async () => {
      const business = await businessSeeder.createBusinessWith({
        ...cleaningBusinessData,
        booking_platform_fee_percentage: 5.0
      });
      
      const user = await userSeeder.createUserWith(
        { ...adminProviderUserData, business_id: business.id },
        { ...adminAuthUserData, email: 'platform5@test.com' }
      );

      const service = await serviceSeeder.createServiceWith({
        ...manicureServiceData,
        business_id: business.id
      });

      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      const bookingInput = createBooking('manicureAtHome', business, [service], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        user.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.price_breakdown.business_fees.platform_fee_percentage).toBe(5);
    });

    it('should apply payment processing fees in 2-4% range', async () => {
      const testCases = [
        { rate: 2.0, name: 'payment2@test.com' },
        { rate: 2.9, name: 'payment2.9@test.com' },
        { rate: 3.5, name: 'payment3.5@test.com' },
        { rate: 4.0, name: 'payment4@test.com' }
      ];

      for (const testCase of testCases) {
        const business = await businessSeeder.createBusinessWith({
          ...removalistBusinessData,
          email: `business-${testCase.rate}@test.com`,
          payment_processing_fee_percentage: testCase.rate
        });
        
        const user = await userSeeder.createUserWith(
          { ...adminProviderUserData, business_id: business.id },
          { ...adminAuthUserData, email: testCase.name }
        );

        const service = await serviceSeeder.createServiceWith({
          ...manicureServiceData,
          business_id: business.id
        });

        const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24 + testCases.indexOf(testCase));
        const bookingInput = createBooking('manicureAtHome', business, [service], addressMappings.beauty);

        const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          user.id,
          startAt
        );

        expect(booking).toBeDefined();
        expect(booking.price_breakdown.business_fees.payment_processing_fee_percentage).toBe(testCase.rate);
        expect(booking.price_breakdown.business_fees.payment_processing_fee_amount).toBeGreaterThan(0);
      }
    });
  });

  describe('Deposit Types', () => {
    it('should apply fixed deposit amounts correctly', async () => {
      const testCases = [
        { amount: 50, name: 'fixed50@test.com' },
        { amount: 100, name: 'fixed100@test.com' },
        { amount: 200, name: 'fixed200@test.com' }
      ];

      for (const testCase of testCases) {
        const business = await businessSeeder.createBusinessWith({
          ...removalistBusinessData,
          email: `business-${testCase.amount}@test.com`,
          deposit_type: DepositType.FIXED,
          deposit_fixed_amount: testCase.amount,
          deposit_percentage: null
        });
        
        const user = await userSeeder.createUserWith(
          { ...adminProviderUserData, business_id: business.id },
          { ...adminAuthUserData, email: testCase.name }
        );

        const service = await serviceSeeder.createServiceWith({
          ...manicureServiceData,
          business_id: business.id
        });

        const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24 + testCases.indexOf(testCase));
        const bookingInput = createBooking('manicureAtHome', business, [service], addressMappings.beauty);

        const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          user.id,
          startAt
        );

        expect(booking).toBeDefined();
        expect(booking.deposit_amount).toBe(testCase.amount);
        expect(booking.remaining_balance).toBe(booking.total_estimate_amount - testCase.amount);
      }
    });

    it('should apply percentage deposits correctly', async () => {
      const testCases = [
        { percentage: 10, name: 'percent10@test.com' },
        { percentage: 25, name: 'percent25@test.com' },
        { percentage: 50, name: 'percent50@test.com' }
      ];

      for (const testCase of testCases) {
        const business = await businessSeeder.createBusinessWith({
          ...cleaningBusinessData,
          email: `business-${testCase.percentage}@test.com`,
          deposit_type: DepositType.PERCENTAGE,
          deposit_percentage: testCase.percentage,
          deposit_fixed_amount: null
        });
        
        const user = await userSeeder.createUserWith(
          { ...adminProviderUserData, business_id: business.id },
          { ...adminAuthUserData, email: testCase.name }
        );

        const service = await serviceSeeder.createServiceWith({
          ...manicureServiceData,
          business_id: business.id
        });

        const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24 + testCases.indexOf(testCase));
        const bookingInput = createBooking('manicureAtHome', business, [service], addressMappings.beauty);

        const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          user.id,
          startAt
        );

        expect(booking).toBeDefined();
        const expectedDeposit = booking.total_estimate_amount * (testCase.percentage / 100);
        expect(booking.deposit_amount).toBeCloseTo(expectedDeposit, 2);
        expect(booking.remaining_balance).toBeCloseTo(booking.total_estimate_amount - expectedDeposit, 2);
      }
    });

    it('should handle no deposit requirement', async () => {
      const business = await businessSeeder.createBusinessWith({
        ...beautyBusinessData,
        charges_deposit: false,
        deposit_type: DepositType.FIXED,
        deposit_fixed_amount: 0,
        deposit_percentage: null
      });
      
      const user = await userSeeder.createUserWith(
        { ...adminProviderUserData, business_id: business.id },
        { ...adminAuthUserData, email: 'nodeposit@test.com' }
      );

      const service = await serviceSeeder.createServiceWith({
        ...manicureServiceData,
        business_id: business.id
      });

      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      const bookingInput = createBooking('manicureAtHome', business, [service], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        user.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(booking.deposit_amount).toBe(0);
      expect(booking.remaining_balance).toBe(booking.total_estimate_amount);
    });
  });

  describe('Subscription Levels', () => {
    it('should handle FREE tier limitations', async () => {
      const business = await businessSeeder.createBusinessWith({
        ...beautyBusinessData,
        subscription_type: SubscriptionType.FREE,
        booking_platform_fee_percentage: 4.0 // Higher fees for free tier
      });
      
      const user = await userSeeder.createUserWith(
        { ...adminProviderUserData, business_id: business.id },
        { ...adminAuthUserData, email: 'free@test.com' }
      );

      const service = await serviceSeeder.createServiceWith({
        ...manicureServiceData,
        business_id: business.id
      });

      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      const bookingInput = createBooking('manicureAtHome', business, [service], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        user.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(business.subscription_type).toBe(SubscriptionType.FREE);
      expect(booking.price_breakdown.business_fees.platform_fee_percentage).toBe(4.0);
    });

    it('should handle BASIC tier features', async () => {
      const business = await businessSeeder.createBusinessWith({
        ...cleaningBusinessData,
        subscription_type: SubscriptionType.BASIC,
        booking_platform_fee_percentage: 3.0 // Mid-tier fees
      });
      
      const user = await userSeeder.createUserWith(
        { ...adminProviderUserData, business_id: business.id },
        { ...adminAuthUserData, email: 'basic@test.com' }
      );

      const service = await serviceSeeder.createServiceWith({
        ...manicureServiceData,
        business_id: business.id
      });

      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      const bookingInput = createBooking('manicureAtHome', business, [service], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        user.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(business.subscription_type).toBe(SubscriptionType.BASIC);
      expect(booking.price_breakdown.business_fees.platform_fee_percentage).toBe(3.0);
    });

    it('should handle PREMIUM tier benefits', async () => {
      const business = await businessSeeder.createBusinessWith({
        ...handymanBusinessData,
        subscription_type: SubscriptionType.PREMIUM,
        booking_platform_fee_percentage: 2.5 // Lower fees for premium
      });
      
      const user = await userSeeder.createUserWith(
        { ...adminProviderUserData, business_id: business.id },
        { ...adminAuthUserData, email: 'premium@test.com' }
      );

      const service = await serviceSeeder.createServiceWith({
        ...manicureServiceData,
        business_id: business.id
      });

      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      const bookingInput = createBooking('manicureAtHome', business, [service], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        user.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(business.subscription_type).toBe(SubscriptionType.PREMIUM);
      expect(booking.price_breakdown.business_fees.platform_fee_percentage).toBe(2.5);
    });

    it('should handle ENTERPRISE tier functionality', async () => {
      const business = await businessSeeder.createBusinessWith({
        ...removalistBusinessData,
        subscription_type: SubscriptionType.ENTERPRISE,
        booking_platform_fee_percentage: 1.5, // Lowest fees for enterprise
        number_of_providers: 20 // Large team
      });
      
      const user = await userSeeder.createUserWith(
        { ...adminProviderUserData, business_id: business.id },
        { ...adminAuthUserData, email: 'enterprise@test.com' }
      );

      const service = await serviceSeeder.createServiceWith({
        ...manicureServiceData,
        business_id: business.id
      });

      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      const bookingInput = createBooking('manicureAtHome', business, [service], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        user.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(business.subscription_type).toBe(SubscriptionType.ENTERPRISE);
      expect(booking.price_breakdown.business_fees.platform_fee_percentage).toBe(1.5);
      expect(business.number_of_providers).toBe(20);
    });
  });

  describe('Payment Methods', () => {
    it('should support credit card only businesses', async () => {
      const business = await businessSeeder.createBusinessWith({
        ...cleaningBusinessData,
        payment_methods: [PaymentMethod.CREDIT_CARD],
        preferred_payment_method: PaymentMethod.CREDIT_CARD
      });
      
      const user = await userSeeder.createUserWith(
        { ...adminProviderUserData, business_id: business.id },
        { ...adminAuthUserData, email: 'creditonly@test.com' }
      );

      const service = await serviceSeeder.createServiceWith({
        ...manicureServiceData,
        business_id: business.id
      });

      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      const bookingInput = createBooking('manicureAtHome', business, [service], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        user.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(business.payment_methods).toEqual([PaymentMethod.CREDIT_CARD]);
      expect(business.preferred_payment_method).toBe(PaymentMethod.CREDIT_CARD);
    });

    it('should support multiple payment options', async () => {
      const business = await businessSeeder.createBusinessWith({
        ...handymanBusinessData,
        payment_methods: [PaymentMethod.CREDIT_CARD, PaymentMethod.CASH, PaymentMethod.PAYPAL],
        preferred_payment_method: PaymentMethod.CASH
      });
      
      const user = await userSeeder.createUserWith(
        { ...adminProviderUserData, business_id: business.id },
        { ...adminAuthUserData, email: 'multipay@test.com' }
      );

      const service = await serviceSeeder.createServiceWith({
        ...manicureServiceData,
        business_id: business.id
      });

      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      const bookingInput = createBooking('manicureAtHome', business, [service], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        user.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(business.payment_methods).toContain(PaymentMethod.CREDIT_CARD);
      expect(business.payment_methods).toContain(PaymentMethod.CASH);
      expect(business.payment_methods).toContain(PaymentMethod.PAYPAL);
    });

    it('should handle cash-preferred businesses', async () => {
      const business = await businessSeeder.createBusinessWith({
        ...removalistBusinessData,
        payment_methods: [PaymentMethod.CASH, PaymentMethod.BANK_TRANSFER],
        preferred_payment_method: PaymentMethod.CASH
      });
      
      const user = await userSeeder.createUserWith(
        { ...adminProviderUserData, business_id: business.id },
        { ...adminAuthUserData, email: 'cashpref@test.com' }
      );

      const service = await serviceSeeder.createServiceWith({
        ...manicureServiceData,
        business_id: business.id
      });

      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      const bookingInput = createBooking('manicureAtHome', business, [service], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        user.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(business.preferred_payment_method).toBe(PaymentMethod.CASH);
    });

    it('should require bank transfer for some businesses', async () => {
      const business = await businessSeeder.createBusinessWith({
        ...beautyBusinessData,
        payment_methods: [PaymentMethod.BANK_TRANSFER],
        preferred_payment_method: PaymentMethod.BANK_TRANSFER
      });
      
      const user = await userSeeder.createUserWith(
        { ...adminProviderUserData, business_id: business.id },
        { ...adminAuthUserData, email: 'bankonly@test.com' }
      );

      const service = await serviceSeeder.createServiceWith({
        ...manicureServiceData,
        business_id: business.id
      });

      const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24);
      const bookingInput = createBooking('manicureAtHome', business, [service], addressMappings.beauty);

      const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
        bookingInput,
        user.id,
        startAt
      );

      expect(booking).toBeDefined();
      expect(business.payment_methods).toEqual([PaymentMethod.BANK_TRANSFER]);
    });
  });

  describe('Minimum Charge Scenarios', () => {
    it('should enforce minimum charges correctly', async () => {
      const testCases = [
        { minCharge: 50, name: 'min50@test.com' },
        { minCharge: 150, name: 'min150@test.com' },
        { minCharge: 300, name: 'min300@test.com' }
      ];

      for (const testCase of testCases) {
        const business = await businessSeeder.createBusinessWith({
          ...beautyBusinessData,
          email: `business-min-${testCase.minCharge}@test.com`,
          minimum_charge: testCase.minCharge
        });
        
        const user = await userSeeder.createUserWith(
          { ...adminProviderUserData, business_id: business.id },
          { ...adminAuthUserData, email: testCase.name }
        );

        const service = await serviceSeeder.createServiceWith({
          ...manicureServiceData,
          business_id: business.id
        });

        const startAt = DateUtils.addHoursUTC(DateUtils.nowUTC(), 24 + testCases.indexOf(testCase));
        const bookingInput = createBooking('manicureAtHome', business, [service], addressMappings.beauty);

        const booking = await bookingsRepository.createBookingWithServicesAndAddresses(
          bookingInput,
          user.id,
          startAt
        );

        expect(booking).toBeDefined();
        expect(booking.total_estimate_amount).toBeGreaterThanOrEqual(testCase.minCharge);
      }
    });
  });
});
