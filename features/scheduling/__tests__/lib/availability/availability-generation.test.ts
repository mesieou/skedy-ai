/**
 * Availability Generation Integration Test
 *
 * Tests the complete availability generation flow using real seed data:
 * - Tiga Removalist business data
 * - Calendar settings data (weekday + weekend providers)
 * - User data for providers
 * - Expected UTC slot generation and day availability checks
 */

import { AvailabilityManager } from '../../../lib/availability/availability-manager';
import { createTigaRemovalistBusinessData } from '@/features/shared/lib/database/seeds/data/business-data';
import { weekdayCalendarSettingsData, weekendCalendarSettingsData } from '@/features/shared/lib/database/seeds/data/calendar-settings-data';
import type { User } from '@/features/shared/lib/database/types/user';
import { UserRole } from '@/features/shared/lib/database/types/user';
import type { CalendarSettings } from '@/features/shared/lib/database/types/calendar-settings';
import type { Business } from '@/features/shared/lib/database/types/business';
import type { AvailabilitySlots } from '@/features/shared/lib/database/types/availability-slots';
import { BookingStatus } from '@/features/shared/lib/database/types/bookings';
import type { PriceBreakdown } from '../../../lib/types/booking-calculations';

describe('Availability Generation Integration Test', () => {
  let business: Business;
  let providers: User[];
  let calendarSettings: CalendarSettings[];
  let availabilityManager: AvailabilityManager;

  beforeEach(() => {
    // Setup business data
    const businessData = createTigaRemovalistBusinessData();
    business = {
      id: 'test-business-id',
      ...businessData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Business;

    // Setup providers (2 users as specified in business data)
    providers = [
      {
        id: 'provider-1-id',
        business_id: business.id,
        email: 'provider1@tigapropertyservices.com',
        first_name: 'John',
        last_name: 'Smith',
        phone_number: '+61400000001',
        role: UserRole.PROVIDER,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'provider-2-id',
        business_id: business.id,
        email: 'provider2@tigapropertyservices.com',
        first_name: 'Jane',
        last_name: 'Doe',
        phone_number: '+61400000002',
        role: UserRole.PROVIDER,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Setup calendar settings (Provider 1 = weekday, Provider 2 = weekend)
    calendarSettings = [
      {
        id: 'calendar-1-id',
        user_id: providers[0].id,
        settings: weekdayCalendarSettingsData.settings,
        working_hours: weekdayCalendarSettingsData.working_hours,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'calendar-2-id',
        user_id: providers[1].id,
        settings: weekendCalendarSettingsData.settings,
        working_hours: weekendCalendarSettingsData.working_hours,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Setup availability manager with empty slots
    const emptySlots: AvailabilitySlots = {
      id: 'availability-id',
      business_id: business.id,
      slots: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    availabilityManager = new AvailabilityManager(emptySlots, business);
  });

  describe('UTC Slot Generation', () => {
    it('should generate correct UTC slots for Thursday October 2nd, 2025', async () => {
      // Generate availability for Thursday business day
      const result = await availabilityManager.generateInitialBusinessAvailability(
        providers,
        calendarSettings,
        '2025-10-02', // Thursday business date
        1 // Generate 1 day only
      );

      // Expected: Both providers work Thursday (Mon-Thu schedule)

      // Check that we have the expected UTC date keys
      expect(Object.keys(result.slots)).toEqual(['2025-10-01', '2025-10-02']);

      // Check 30-minute slots for each UTC date
      const oct1Slots = result.slots['2025-10-01']['30'];
      const oct2Slots = result.slots['2025-10-02']['30'];

      console.log('ACTUAL Thursday Oct 1 slots:', JSON.stringify(oct1Slots, null, 2));
      console.log('ACTUAL Thursday Oct 2 slots:', JSON.stringify(oct2Slots, null, 2));

      expect(oct1Slots).toHaveLength(3); // 21:00-23:00 (3 hourly slots)
      expect(oct2Slots).toHaveLength(7); // 00:00-06:00 (7 hourly slots)

      // Verify provider counts (should be 2 for all Thursday slots)
      oct1Slots.forEach(([, count]: [string, number, number]) => {
        expect(count).toBe(2);
      });
      oct2Slots.forEach(([, count]: [string, number, number]) => {
        expect(count).toBe(2);
      });
    });

    it('should generate correct UTC slots for Friday October 3rd, 2025', async () => {
      // Generate availability for Friday business day
      const result = await availabilityManager.generateInitialBusinessAvailability(
        providers,
        calendarSettings,
        '2025-10-03', // Friday business date
        1 // Generate 1 day only
      );

      // Expected: Only Provider 1 works Friday (Provider 2 has fri: null)
      expect(Object.keys(result.slots)).toEqual(['2025-10-02', '2025-10-03']);

      const oct2Slots = result.slots['2025-10-02']['30'];
      const oct3Slots = result.slots['2025-10-03']['30'];

      // Verify provider counts (should be 1 for all Friday slots)
      oct2Slots.forEach(([, count]: [string, number, number]) => {
        expect(count).toBe(1);
      });
      oct3Slots.forEach(([, count]: [string, number, number]) => {
        expect(count).toBe(1);
      });
    });

    it('should generate correct UTC slots for Saturday October 4th, 2025', async () => {
      // Generate availability for Saturday business day
      const result = await availabilityManager.generateInitialBusinessAvailability(
        providers,
        calendarSettings,
        '2025-10-04', // Saturday business date
        1 // Generate 1 day only
      );

      // Expected: Only Provider 2 works Saturday 07:00-13:00 (Provider 1 has sat: null)
      expect(Object.keys(result.slots)).toEqual(['2025-10-03', '2025-10-04']);

      const oct3Slots = result.slots['2025-10-03']['30'];
      const oct4Slots = result.slots['2025-10-04']['30'];

      expect(oct3Slots).toHaveLength(3); // 21:00-23:00 (3 hourly slots)
      expect(oct4Slots).toHaveLength(3); // 00:00-02:00 (3 hourly slots) - shorter day

      // Verify provider counts (should be 1 for all Saturday slots)
      oct3Slots.forEach(([, count]: [string, number, number]) => {
        expect(count).toBe(1);
      });
      oct4Slots.forEach(([, count]: [string, number, number]) => {
        expect(count).toBe(1);
      });
    });
  });

  describe('Day Availability Checks', () => {
    beforeEach(async () => {
      // Generate availability for Saturday to test day availability checks
      const result = await availabilityManager.generateInitialBusinessAvailability(
        providers,
        calendarSettings,
        '2025-10-04', // Saturday business date
        1 // Generate 1 day only
      );

      // Update the manager with generated slots
      availabilityManager = new AvailabilityManager(result, business);
    });

    it('should return correct availability for Saturday with 2.5 hour duration', () => {
      const result = availabilityManager.checkDayAvailability('2025-10-04', 150); // 2.5 hours = 150 minutes

      expect(result.success).toBe(true);
      expect(result.date).toBe('2025-10-04');
      expect(result.availableSlots).toEqual([
        { time: "07:00", providerCount: 1 },
        { time: "08:00", providerCount: 1 },
        { time: "09:00", providerCount: 1 },
        { time: "10:00", providerCount: 1 }
      ]);
      expect(result.formattedMessage).toContain('Saturday 4th October');
      expect(result.formattedMessage).toContain('7:00 am');
      expect(result.formattedMessage).toContain('10:00 am');
    });

    it('should return correct availability after booking 10 AM for 2.5 hours', () => {
      // Simulate a booking from 10:00-12:30 Melbourne time
      const priceBreakdown: PriceBreakdown = {
        service_breakdowns: [],
        travel_breakdown: {
          total_distance_km: 0,
          total_travel_time_mins: 0,
          total_travel_cost: 0,
          route_segments: []
        },
        business_fees: {
          gst_amount: 0,
          platform_fee: 0,
          payment_processing_fee: 0,
          other_fees: []
        }
      };

      const booking = {
        id: 'test-booking-id',
        business_id: business.id,
        start_at: '2025-10-03T23:00:00.000Z', // 10:00 Melbourne = 23:00 UTC Oct 3
        end_at: '2025-10-04T01:30:00.000Z',   // 12:30 Melbourne = 01:30 UTC Oct 4
        user_id: 'customer-id',
        status: BookingStatus.CONFIRMED,
        total_estimate_amount: 200,
        total_estimate_time_in_minutes: 150,
        deposit_amount: 50,
        remaining_balance: 150,
        deposit_paid: false,
        price_breakdown: priceBreakdown,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Update availability after booking
      const updatedSlots = availabilityManager.updateAvailabilityAfterBooking(booking);
      const updatedManager = new AvailabilityManager(updatedSlots, business);

      // Check availability for 1-hour duration
      const result = updatedManager.checkDayAvailability('2025-10-04', 60); // 1 hour = 60 minutes

      expect(result.success).toBe(true);
      expect(result.availableSlots).toEqual([
        { time: "07:00", providerCount: 1 },
        { time: "08:00", providerCount: 1 },
        { time: "12:00", providerCount: 1 }
      ]);
      expect(result.formattedMessage).toContain('7:00 am');
      expect(result.formattedMessage).toContain('12:00 pm');
    });

    it('should return no availability when checking 2-hour duration after multiple bookings', () => {
      // Simulate multiple bookings that leave only 1-hour gaps
      const defaultPriceBreakdown: PriceBreakdown = {
        service_breakdowns: [],
        travel_breakdown: {
          total_distance_km: 0,
          total_travel_time_mins: 0,
          total_travel_cost: 0,
          route_segments: []
        },
        business_fees: {
          gst_amount: 0,
          platform_fee: 0,
          payment_processing_fee: 0,
          other_fees: []
        }
      };

      const bookings = [
        {
          id: 'booking-1',
          business_id: business.id,
          start_at: '2025-10-03T20:00:00.000Z', // 07:00 Melbourne = 20:00 UTC Oct 3
          end_at: '2025-10-03T21:00:00.000Z',   // 08:00 Melbourne = 21:00 UTC Oct 3
          user_id: 'customer-1',
          status: BookingStatus.CONFIRMED,
          total_estimate_amount: 100,
          total_estimate_time_in_minutes: 60,
          deposit_amount: 25,
          remaining_balance: 75,
          deposit_paid: false,
          price_breakdown: defaultPriceBreakdown,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'booking-2',
          business_id: business.id,
          start_at: '2025-10-03T21:00:00.000Z', // 08:00 Melbourne = 21:00 UTC Oct 3
          end_at: '2025-10-03T22:00:00.000Z',   // 09:00 Melbourne = 22:00 UTC Oct 3
          user_id: 'customer-2',
          status: BookingStatus.CONFIRMED,
          total_estimate_amount: 100,
          total_estimate_time_in_minutes: 60,
          deposit_amount: 25,
          remaining_balance: 75,
          deposit_paid: false,
          price_breakdown: defaultPriceBreakdown,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'booking-3',
          business_id: business.id,
          start_at: '2025-10-03T23:00:00.000Z', // 10:00 Melbourne = 23:00 UTC Oct 3
          end_at: '2025-10-04T01:30:00.000Z',   // 12:30 Melbourne = 01:30 UTC Oct 4
          user_id: 'customer-3',
          status: BookingStatus.CONFIRMED,
          total_estimate_amount: 250,
          total_estimate_time_in_minutes: 150,
          deposit_amount: 62.5,
          remaining_balance: 187.5,
          deposit_paid: false,
          price_breakdown: defaultPriceBreakdown,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      // Apply all bookings
      let currentManager = availabilityManager;

      for (const booking of bookings) {
        const updatedSlots = currentManager.updateAvailabilityAfterBooking(booking);
        currentManager = new AvailabilityManager(updatedSlots, business);
      }

      // Check availability for 2-hour duration (should be none)
      const result = currentManager.checkDayAvailability('2025-10-04', 120); // 2 hours = 120 minutes

      expect(result.success).toBe(true);
      expect(result.availableSlots).toEqual([]);
      expect(result.formattedMessage).toBe("Unfortunately, we're fully booked on Saturday 4th October.");
    });
  });

  describe('Provider Calendar Settings Validation', () => {
    it('should respect individual provider working hours', () => {
      // Verify Provider 1 (weekday) settings
      const provider1Settings = calendarSettings.find(cs => cs.user_id === providers[0].id);
      expect(provider1Settings?.working_hours.thu).toEqual({ start: '07:00', end: '17:00' });
      expect(provider1Settings?.working_hours.fri).toEqual({ start: '07:00', end: '17:00' });
      expect(provider1Settings?.working_hours.sat).toBeNull();
      expect(provider1Settings?.working_hours.sun).toBeNull();

      // Verify Provider 2 (weekend) settings
      const provider2Settings = calendarSettings.find(cs => cs.user_id === providers[1].id);
      expect(provider2Settings?.working_hours.thu).toEqual({ start: '07:00', end: '17:00' });
      expect(provider2Settings?.working_hours.fri).toBeNull();
      expect(provider2Settings?.working_hours.sat).toEqual({ start: '07:00', end: '13:00' });
      expect(provider2Settings?.working_hours.sun).toEqual({ start: '07:00', end: '13:00' });
    });

    it('should use correct business timezone', () => {
      expect(business.time_zone).toBe('Australia/Melbourne');
    });

    it('should have correct number of providers', () => {
      expect(business.number_of_providers).toBe(2);
      expect(providers).toHaveLength(2);
      expect(calendarSettings).toHaveLength(2);
    });
  });
});
