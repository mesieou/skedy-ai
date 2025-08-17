import { AvailabilityManager } from '../../../lib/availability/availability-manager';
import { BusinessSeeder } from '../../../../shared/lib/database/seeds/business-seeder';
import { UserSeeder } from '../../../../shared/lib/database/seeds/user-seeder';
import { AuthUserSeeder } from '../../../../shared/lib/database/seeds/auth-user-seeder';
import { CalendarSettingsSeeder } from '../../../../shared/lib/database/seeds/calendar-settings-seeder';
import { AvailabilitySlotsSeeder } from '../../../../shared/lib/database/seeds/availability-slots-seeder';


// Test data imports
import { 
  removalistBusinessData,
  mobileManicuristBusinessData
} from '../../../../shared/lib/database/seeds/data/business-data';

import {
  adminProviderUserData,
  providerUserData
} from '../../../../shared/lib/database/seeds/data/user-data';

import {
  weekdayCalendarSettingsData,
  weekendCalendarSettingsData
} from '../../../../shared/lib/database/seeds/data/calendar-settings-data';

import {
  adminAuthUserData,
  providerAuthUserData
} from '../../../../shared/lib/database/seeds/data/auth-user-data';

import type { Business } from '../../../../shared/lib/database/types/business';
import type { User } from '../../../../shared/lib/database/types/user';
import type { CalendarSettings } from '../../../../shared/lib/database/types/calendar-settings';
import type { AvailabilitySlots } from '../../../../shared/lib/database/types/availability-slots';
import type { Booking } from '../../../../shared/lib/database/types/bookings';
import { BookingStatus } from '../../../../shared/lib/database/types/bookings';
import { DateUtils } from '../../../../shared/utils/date-utils';

// Test constants - no hardcoding
const TEST_TIMEOUT = 30000;
const DAYS_AHEAD_FOR_TEST = 7;
const AVAILABILITY_GENERATION_DAYS = 7;
const SINGLE_PROVIDER_COUNT = 1;
const MULTI_PROVIDER_COUNT = 2;
const PHONE_BASE = "+61411000";
const TEST_BOOKING_AMOUNT = 100;
const TEST_DEPOSIT_AMOUNT = 50;
const MULTI_HOUR_BOOKING_DURATION = 240; // 4 hours
const SAMPLE_SLOT_DURATION = 60;
const LONG_SLOT_DURATION = 150;

describe('AvailabilityManager - updateAvailabilityAfterBooking', () => {
  jest.setTimeout(TEST_TIMEOUT);

  let businessSeeder: BusinessSeeder;
  let userSeeder: UserSeeder;
  let authUserSeeder: AuthUserSeeder;
  let calendarSettingsSeeder: CalendarSettingsSeeder;
  let availabilitySlotsSeeder: AvailabilitySlotsSeeder;

  // Test data containers
  let singleProviderBusiness: Business;
  let multiProviderBusiness: Business;
  let singleProvider: User;
  let provider1: User;
  let provider2: User;
  let singleProviderCalendarSettings: CalendarSettings;
  let provider1CalendarSettings: CalendarSettings;
  let provider2CalendarSettings: CalendarSettings;
  let singleProviderAvailability: AvailabilitySlots;
  let multiProviderAvailability: AvailabilitySlots;

  // Ensure test date falls on Mon-Thu (when both providers work)
  // weekdayCalendarSettingsData: Mon-Fri
  // weekendCalendarSettingsData: Mon-Thu + Sat-Sun (no Friday)
  let testDate = DateUtils.addDaysUTC(DateUtils.nowUTC(), DAYS_AHEAD_FOR_TEST);
  const testJsDate = new Date(testDate);
  const dayOfWeek = testJsDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (UTC-based)
  
  // Move to Monday-Thursday when both calendar types work
  if (dayOfWeek === 0) { // Sunday
    testDate = DateUtils.addDaysUTC(testDate, 1); // Move to Monday
  } else if (dayOfWeek === 5) { // Friday - only weekday provider works
    testDate = DateUtils.addDaysUTC(testDate, 3); // Move to Monday
  } else if (dayOfWeek === 6) { // Saturday  
    testDate = DateUtils.addDaysUTC(testDate, 2); // Move to Monday
  }
  
  const testDateStr = DateUtils.extractDateString(testDate);
  
  console.log(`Test date: ${testDateStr} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(testDate).getUTCDay()]})`);

  beforeAll(async () => {
    // Initialize seeders
    businessSeeder = new BusinessSeeder();
    authUserSeeder = new AuthUserSeeder();
    userSeeder = new UserSeeder(authUserSeeder);
    calendarSettingsSeeder = new CalendarSettingsSeeder();
    availabilitySlotsSeeder = new AvailabilitySlotsSeeder();

    // Clean up existing test data
    await availabilitySlotsSeeder.cleanup();
    await calendarSettingsSeeder.cleanup();
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await availabilitySlotsSeeder.cleanup();
    await calendarSettingsSeeder.cleanup();
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();
  });

  async function setupTestData() {
    // Create businesses
    singleProviderBusiness = await businessSeeder.createBusinessWith(removalistBusinessData);
    multiProviderBusiness = await businessSeeder.createBusinessWith(mobileManicuristBusinessData);

    // Create users for single provider business
    singleProvider = await userSeeder.createUserWith({
      ...adminProviderUserData,
      business_id: singleProviderBusiness.id,
      email: "single.provider@test.com",
      phone_number: `${PHONE_BASE}001`
    }, {
      ...adminAuthUserData,
      email: "single.provider@test.com"
    });

    // Create users for multi-provider business
    provider1 = await userSeeder.createUserWith({
      ...adminProviderUserData,
      business_id: multiProviderBusiness.id,
      email: "provider1@test.com",
      phone_number: `${PHONE_BASE}002`
    }, {
      ...adminAuthUserData,
      email: "provider1@test.com"
    });

    provider2 = await userSeeder.createUserWith({
      ...providerUserData,
      business_id: multiProviderBusiness.id,
      email: "provider2@test.com",
      phone_number: `${PHONE_BASE}003`
    }, {
      ...providerAuthUserData,
      email: "provider2@test.com"
    });

    // Create calendar settings using existing data - test different schedules
    singleProviderCalendarSettings = await calendarSettingsSeeder.createCalendarSettingsWith({
      ...weekdayCalendarSettingsData,
      user_id: singleProvider.id
    });

    provider1CalendarSettings = await calendarSettingsSeeder.createCalendarSettingsWith({
      ...weekdayCalendarSettingsData,
      user_id: provider1.id
    });

    provider2CalendarSettings = await calendarSettingsSeeder.createCalendarSettingsWith({
      ...weekendCalendarSettingsData,
      user_id: provider2.id
    });

    // Generate availability slots
    singleProviderAvailability = await availabilitySlotsSeeder.generateAvailabilitySlots(
      singleProviderBusiness.id,
      [singleProvider],
      [singleProviderCalendarSettings],
      testDate,
      AVAILABILITY_GENERATION_DAYS
    );

    multiProviderAvailability = await availabilitySlotsSeeder.generateAvailabilitySlots(
      multiProviderBusiness.id,
      [provider1, provider2],
      [provider1CalendarSettings, provider2CalendarSettings],
      testDate,
      AVAILABILITY_GENERATION_DAYS
    );

    // Debug: Log generated availability
    console.log(`Single provider availability for ${testDateStr}:`, {
      '60': singleProviderAvailability.slots[testDateStr]?.['60']?.length || 0,
      '90': singleProviderAvailability.slots[testDateStr]?.['90']?.length || 0,
      'sample_60_slots': singleProviderAvailability.slots[testDateStr]?.['60']?.slice(0, 3)
    });
    
    console.log(`Multi provider availability for ${testDateStr}:`, {
      '60': multiProviderAvailability.slots[testDateStr]?.['60']?.length || 0,
      'sample_60_slots': multiProviderAvailability.slots[testDateStr]?.['60']?.slice(0, 3)
    });

    console.log(`Calendar settings:`, {
      single: singleProviderCalendarSettings.working_hours,
      provider1: provider1CalendarSettings.working_hours,
      provider2: provider2CalendarSettings.working_hours
    });
  }

  function createTestBooking(
    providerId: string,
    businessId: string,
    startTime: string,
    durationMinutes: number
  ): Booking {
    const startDateTime = DateUtils.createSlotTimestamp(testDateStr, startTime);
    const endDateTime = DateUtils.calculateEndTimestamp(startDateTime, durationMinutes);

    return {
      id: `booking-${Date.now()}-${Math.random()}`,
      business_id: businessId,
      user_id: providerId,
      start_at: startDateTime,
      end_at: endDateTime,
      status: BookingStatus.CONFIRMED,
      total_estimate_amount: TEST_BOOKING_AMOUNT,
      total_estimate_time_in_minutes: durationMinutes,
      deposit_amount: TEST_DEPOSIT_AMOUNT,
      remaining_balance: TEST_DEPOSIT_AMOUNT,
      deposit_paid: false,
      price_breakdown: {
        service_breakdowns: [],
        travel_breakdown: { 
          total_travel_cost: 0, 
          total_distance_km: 0,
          total_travel_time_mins: 0,
          free_travel_applied: false,
          free_travel_distance_km: 0,
          route_segments: [] 
        },
        business_fees: { 
          gst_rate: 0, 
          gst_amount: 0, 
          platform_fee: 0,
          platform_fee_amount: 0,
          platform_fee_percentage: 0,
          payment_processing_fee: 0,
          payment_processing_fee_percentage: 0,
          payment_processing_fee_amount: 0,
          other_fees: []
        }
      },
      created_at: DateUtils.nowUTC(),
      updated_at: DateUtils.nowUTC()
    } as Booking;
  }

  describe('Single Provider Business', () => {
    test('should remove time slots completely when single provider is booked', () => {
      // Get initial availability for 60-minute slots
      const initialSlots = singleProviderAvailability.slots[testDateStr]?.['60'] || [];
      expect(initialSlots.length).toBeGreaterThan(0);
      
      // Find a slot that has availability (count > 0)
      const availableSlot = initialSlots.find(([, count]) => count > 0);
      expect(availableSlot).toBeDefined();
      
      const [slotTime, initialCount] = availableSlot!;
      expect(initialCount).toBe(SINGLE_PROVIDER_COUNT); // Single provider should have count of 1

      // Create a booking that overlaps this slot
      const booking = createTestBooking(singleProvider.id, singleProviderBusiness.id, slotTime, SAMPLE_SLOT_DURATION);

      // Create availability manager and update availability
      const manager = new AvailabilityManager(singleProviderAvailability, singleProviderBusiness);
      const updatedAvailability = manager.updateAvailabilityAfterBooking(booking);

      // Check that the slot is completely removed (not in the array anymore)
      const updatedSlots = updatedAvailability.slots[testDateStr]?.['60'] || [];
      const bookedSlot = updatedSlots.find(([time]) => time === slotTime);
      expect(bookedSlot).toBeUndefined(); // Slot should be completely removed

      console.log(`Single provider: Slot ${slotTime} removed completely after booking`);
    });

    test('should handle multiple duration intervals correctly for single provider', () => {
      // Test with 90-minute slots
      const initialSlots90 = singleProviderAvailability.slots[testDateStr]?.['90'] || [];
      const availableSlot90 = initialSlots90.find(([, count]) => count > 0);
      expect(availableSlot90).toBeDefined();

      const [slotTime90, initialCount90] = availableSlot90!;
      expect(initialCount90).toBe(SINGLE_PROVIDER_COUNT);

      // Create a 90-minute booking
      const booking90 = createTestBooking(singleProvider.id, singleProviderBusiness.id, slotTime90, 90);

      const manager = new AvailabilityManager(singleProviderAvailability, singleProviderBusiness);
      const updatedAvailability = manager.updateAvailabilityAfterBooking(booking90);

      // Check 90-minute slots - booked slot should be removed
      const updatedSlots90 = updatedAvailability.slots[testDateStr]?.['90'] || [];
      const bookedSlot90 = updatedSlots90.find(([time]) => time === slotTime90);
      expect(bookedSlot90).toBeUndefined();

      // Check that other duration slots overlapping this time are also affected
      const updatedSlots60 = updatedAvailability.slots[testDateStr]?.['60'] || [];
      const overlappingSlots = updatedSlots60.filter(([time]) => {
        const slotStart = DateUtils.createSlotTimestamp(testDateStr, time);
        const slotEnd = DateUtils.calculateEndTimestamp(slotStart, 60);
        return DateUtils.doPeriodsOverlap(
          slotStart, slotEnd,
          booking90.start_at, booking90.end_at
        );
      });
      
      // All overlapping 60-minute slots should be removed as well
      expect(overlappingSlots.length).toBe(0);

      console.log(`Single provider: 90-min booking at ${slotTime90} removed overlapping slots`);
    });
  });

  describe('Multi-Provider Business', () => {
    test('should reduce availability count by 1 when one provider is booked', () => {
      // Get initial availability for 60-minute slots
      const initialSlots = multiProviderAvailability.slots[testDateStr]?.['60'] || [];
      expect(initialSlots.length).toBeGreaterThan(0);
      
      // Find a slot with 2 providers available
      const availableSlot = initialSlots.find(([, count]) => count === MULTI_PROVIDER_COUNT);
      expect(availableSlot).toBeDefined();
      
      const [slotTime, initialCount] = availableSlot!;
      expect(initialCount).toBe(MULTI_PROVIDER_COUNT); // Two providers should be available

      // Create a booking for one provider
      const booking = createTestBooking(provider1.id, multiProviderBusiness.id, slotTime, 60);

      // Create availability manager and update availability
      const manager = new AvailabilityManager(multiProviderAvailability, multiProviderBusiness);
      const updatedAvailability = manager.updateAvailabilityAfterBooking(booking);

      // Check that the slot count is reduced by 1
      const updatedSlots = updatedAvailability.slots[testDateStr]?.['60'] || [];
      const updatedSlot = updatedSlots.find(([time]) => time === slotTime);
      expect(updatedSlot).toBeDefined();
      expect(updatedSlot![1]).toBe(1); // Count should be reduced from 2 to 1

      console.log(`Multi-provider: Slot ${slotTime} reduced from ${initialCount} to ${updatedSlot![1]}`);
    });

    test('should remove slot completely when both providers are booked', () => {
      // Get initial availability for 120-minute slots  
      const initialSlots = multiProviderAvailability.slots[testDateStr]?.['120'] || [];
      const availableSlot = initialSlots.find(([, count]) => count === 2);
      expect(availableSlot).toBeDefined();
      
      const [slotTime, initialCount] = availableSlot!;
      expect(initialCount).toBe(2);

      // Create first booking
      const booking1 = createTestBooking(provider1.id, multiProviderBusiness.id, slotTime, 120);
      
      let manager = new AvailabilityManager(multiProviderAvailability, multiProviderBusiness);
      let updatedAvailability = manager.updateAvailabilityAfterBooking(booking1);

      // After first booking, count should be 1
      let updatedSlots = updatedAvailability.slots[testDateStr]?.['120'] || [];
      let updatedSlot = updatedSlots.find(([time]) => time === slotTime);
      expect(updatedSlot).toBeDefined();
      expect(updatedSlot![1]).toBe(1);

      // Create second booking
      const booking2 = createTestBooking(provider2.id, multiProviderBusiness.id, slotTime, 120);
      
      manager = new AvailabilityManager(updatedAvailability, multiProviderBusiness);
      updatedAvailability = manager.updateAvailabilityAfterBooking(booking2);

      // After second booking, slot should be completely removed
      updatedSlots = updatedAvailability.slots[testDateStr]?.['120'] || [];
      updatedSlot = updatedSlots.find(([time]) => time === slotTime);
      expect(updatedSlot).toBeUndefined();

      console.log(`Multi-provider: Slot ${slotTime} removed completely after both providers booked`);
    });

    test('should handle overlapping bookings across different duration slots', () => {
      // Test a 180-minute booking and its effect on shorter duration slots
      const initialSlots180 = multiProviderAvailability.slots[testDateStr]?.['180'] || [];
      const availableSlot180 = initialSlots180.find(([, count]) => count === 2);
      expect(availableSlot180).toBeDefined();

      const [slotTime180] = availableSlot180!;
      
      // Create a 180-minute booking
      const booking180 = createTestBooking(provider1.id, multiProviderBusiness.id, slotTime180, 180);

      const manager = new AvailabilityManager(multiProviderAvailability, multiProviderBusiness);
      const updatedAvailability = manager.updateAvailabilityAfterBooking(booking180);

      // Check that 180-minute slot count is reduced
      const updatedSlots180 = updatedAvailability.slots[testDateStr]?.['180'] || [];
      const updatedSlot180 = updatedSlots180.find(([time]) => time === slotTime180);
      expect(updatedSlot180).toBeDefined();
      expect(updatedSlot180![1]).toBe(1);

      // Check that overlapping 60-minute slots are also reduced
      const updatedSlots60 = updatedAvailability.slots[testDateStr]?.['60'] || [];
      const bookingStart = DateUtils.createSlotTimestamp(testDateStr, slotTime180);
      const bookingEnd = DateUtils.calculateEndTimestamp(bookingStart, 180);
      
      // Find all 60-minute slots that overlap with the 180-minute booking
      const overlappingSlots60 = updatedSlots60.filter(([time]) => {
        const slotStart = DateUtils.createSlotTimestamp(testDateStr, time);
        const slotEnd = DateUtils.calculateEndTimestamp(slotStart, 60);
        return DateUtils.doPeriodsOverlap(slotStart, slotEnd, bookingStart, bookingEnd);
      });

      // All overlapping 60-minute slots should have their count reduced by 1
      overlappingSlots60.forEach(([time, count]) => {
        expect(count).toBe(1); // Should be reduced from 2 to 1
        console.log(`Overlapping 60-min slot at ${time} reduced to count ${count}`);
      });

      console.log(`Multi-provider: 180-min booking affected ${overlappingSlots60.length} overlapping 60-min slots`);
    });
  });

  describe('Edge Cases', () => {
    test('should handle booking that spans multiple time slots', () => {
      // Create a 150-minute booking that will span multiple hourly slots
      const initialSlots60 = singleProviderAvailability.slots[testDateStr]?.['60'] || [];
      const firstAvailableSlot = initialSlots60.find(([, count]) => count > 0);
      expect(firstAvailableSlot).toBeDefined();

      const [startTime] = firstAvailableSlot!;
      
      // Create a 150-minute booking starting at this time
      const booking = createTestBooking(singleProvider.id, singleProviderBusiness.id, startTime, LONG_SLOT_DURATION);

      const manager = new AvailabilityManager(singleProviderAvailability, singleProviderBusiness);
      const updatedAvailability = manager.updateAvailabilityAfterBooking(booking);

      // Check that all overlapping slots are removed
      const updatedSlots60 = updatedAvailability.slots[testDateStr]?.['60'] || [];
      const bookingStart = DateUtils.createSlotTimestamp(testDateStr, startTime);
      const bookingEnd = DateUtils.calculateEndTimestamp(bookingStart, 150);

      const remainingOverlappingSlots = updatedSlots60.filter(([time]) => {
        const slotStart = DateUtils.createSlotTimestamp(testDateStr, time);
        const slotEnd = DateUtils.calculateEndTimestamp(slotStart, 60);
        return DateUtils.doPeriodsOverlap(slotStart, slotEnd, bookingStart, bookingEnd);
      });

      expect(remainingOverlappingSlots.length).toBe(0);
      console.log(`Single provider: 150-min booking removed all overlapping 60-min slots`);
    });

    test('should not affect slots that do not overlap', () => {
      // Get morning and afternoon slots that are far apart
      const initialSlots60 = multiProviderAvailability.slots[testDateStr]?.['60'] || [];
      const morningSlot = initialSlots60.find(([time, count]) => 
        time.startsWith('07:') && count === 2
      );
      const afternoonSlot = initialSlots60.find(([time, count]) => 
        time.startsWith('15:') && count === 2
      );

      expect(morningSlot).toBeDefined();
      expect(afternoonSlot).toBeDefined();

      const [morningTime] = morningSlot!;
      const [afternoonTime] = afternoonSlot!;

      // Book the morning slot
      const morningBooking = createTestBooking(provider1.id, multiProviderBusiness.id, morningTime, 60);

      const manager = new AvailabilityManager(multiProviderAvailability, multiProviderBusiness);
      const updatedAvailability = manager.updateAvailabilityAfterBooking(morningBooking);

      // Check that morning slot is affected
      const updatedSlots = updatedAvailability.slots[testDateStr]?.['60'] || [];
      const updatedMorningSlot = updatedSlots.find(([time]) => time === morningTime);
      expect(updatedMorningSlot).toBeDefined();
      expect(updatedMorningSlot![1]).toBe(1); // Reduced from 2 to 1

      // Check that afternoon slot is NOT affected
      const updatedAfternoonSlot = updatedSlots.find(([time]) => time === afternoonTime);
      expect(updatedAfternoonSlot).toBeDefined();
      expect(updatedAfternoonSlot![1]).toBe(2); // Should remain unchanged

      console.log(`Non-overlapping test: Morning slot ${morningTime} affected, afternoon slot ${afternoonTime} unchanged`);
    });

    test('should handle multi-hour booking with slot-by-slot verification (10:00 AM - 2:00 PM)', () => {
      // Test a 4-hour booking from 10:00 AM to 2:00 PM and verify each hourly slot
      
      // Create 4-hour booking from 10:00 AM to 2:00 PM
      const booking = createTestBooking(provider1.id, multiProviderBusiness.id, "10:00", MULTI_HOUR_BOOKING_DURATION);
      
      const manager = new AvailabilityManager(multiProviderAvailability, multiProviderBusiness);
      const updatedAvailability = manager.updateAvailabilityAfterBooking(booking);
      const updatedSlots = updatedAvailability.slots[testDateStr]?.['60'] || [];

      // Define the slots to check: before, during, and after the booking
      const slotsToCheck = [
        { time: "07:00", expected: MULTI_PROVIDER_COUNT, description: "Early morning (before booking)" },
        { time: "08:00", expected: MULTI_PROVIDER_COUNT, description: "Morning (before booking)" }, 
        { time: "09:00", expected: MULTI_PROVIDER_COUNT, description: "One hour before booking" },
        { time: "10:00", expected: SINGLE_PROVIDER_COUNT, description: "Booking start time (10:00-11:00 overlaps 10:00-14:00)" },
        { time: "11:00", expected: SINGLE_PROVIDER_COUNT, description: "During booking (11:00-12:00 overlaps 10:00-14:00)" },
        { time: "12:00", expected: SINGLE_PROVIDER_COUNT, description: "During booking (12:00-13:00 overlaps 10:00-14:00)" },
        { time: "13:00", expected: SINGLE_PROVIDER_COUNT, description: "Last hour of booking (13:00-14:00 overlaps 10:00-14:00)" },
        { time: "14:00", expected: MULTI_PROVIDER_COUNT, description: "Immediately after booking ends" },
        { time: "15:00", expected: MULTI_PROVIDER_COUNT, description: "One hour after booking" },
        { time: "16:00", expected: MULTI_PROVIDER_COUNT, description: "Afternoon (after booking)" }
      ];

      // Verify each slot
      slotsToCheck.forEach(({ time, expected, description }) => {
        const slot = updatedSlots.find(([slotTime]) => slotTime === time);
        
        if (expected === MULTI_PROVIDER_COUNT) {
          // Slot should remain unchanged with 2 providers
          expect(slot).toBeDefined();
          expect(slot![1]).toBe(MULTI_PROVIDER_COUNT);
          console.log(`✅ ${time} slot: Available (count: ${slot![1]}) - ${description}`);
        } else {
          // Slot should be reduced to 1 provider due to booking overlap
          expect(slot).toBeDefined();
          expect(slot![1]).toBe(SINGLE_PROVIDER_COUNT);
          console.log(`⚠️  ${time} slot: Reduced (count: ${slot![1]}) - ${description}`);
        }
      });

      console.log(`Multi-hour booking test: 10:00-14:00 booking correctly affected overlapping slots while preserving non-overlapping ones`);
    });

    test('should reduce single provider slots from 1 to 0 (complete removal)', () => {
      // Test single provider business: 1 provider → 0 providers = slot completely removed
      const initialSlots60 = singleProviderAvailability.slots[testDateStr]?.['60'] || [];
      const availableSlot = initialSlots60.find(([, count]) => count === 1);
      expect(availableSlot).toBeDefined();
      
      const [slotTime] = availableSlot!;
      
      // Create booking that overlaps this slot
      const booking = createTestBooking(singleProvider.id, singleProviderBusiness.id, slotTime, 60);
      
      const manager = new AvailabilityManager(singleProviderAvailability, singleProviderBusiness);
      const updatedAvailability = manager.updateAvailabilityAfterBooking(booking);
      
      // Verify the slot is completely removed (not just reduced to 0)
      const updatedSlots = updatedAvailability.slots[testDateStr]?.['60'] || [];
      const removedSlot = updatedSlots.find(([time]) => time === slotTime);
      
      expect(removedSlot).toBeUndefined(); // Slot should be completely absent from array
      
      console.log(`Single provider test: Slot ${slotTime} completely removed (1 → 0 = removed from array)`);
    });

    test('should verify slots are completely absent when all providers are booked', () => {
      // Test multi-provider: Book both providers for same time slot
      const initialSlots60 = multiProviderAvailability.slots[testDateStr]?.['60'] || [];
      const availableSlot = initialSlots60.find(([, count]) => count === 2);
      expect(availableSlot).toBeDefined();
      
      const [slotTime] = availableSlot!;
      
      // Book first provider
      const booking1 = createTestBooking(provider1.id, multiProviderBusiness.id, slotTime, 60);
      let manager = new AvailabilityManager(multiProviderAvailability, multiProviderBusiness);
      let updatedAvailability = manager.updateAvailabilityAfterBooking(booking1);
      
      // After first booking: 2 → 1
      let updatedSlots = updatedAvailability.slots[testDateStr]?.['60'] || [];
      const partiallyBookedSlot = updatedSlots.find(([time]) => time === slotTime);
      expect(partiallyBookedSlot).toBeDefined();
      expect(partiallyBookedSlot![1]).toBe(1);
      
      // Book second provider (same time slot)
      const booking2 = createTestBooking(provider2.id, multiProviderBusiness.id, slotTime, 60);
      manager = new AvailabilityManager(updatedAvailability, multiProviderBusiness);
      updatedAvailability = manager.updateAvailabilityAfterBooking(booking2);
      
      // After second booking: 1 → 0 = slot completely removed
      updatedSlots = updatedAvailability.slots[testDateStr]?.['60'] || [];
      const fullyBookedSlot = updatedSlots.find(([time]) => time === slotTime);
      expect(fullyBookedSlot).toBeUndefined(); // Slot should be completely absent
      
      console.log(`Multi-provider exhaustion test: Slot ${slotTime} completely removed after both providers booked (2 → 1 → 0 = removed)`);
    });

    test('should not affect other days - verify day isolation', () => {
      // Test that booking on one day doesn't affect availability on other days
      const testDate2 = DateUtils.addDaysUTC(testDate, 1); // Day after test date
      const testDate2Str = DateUtils.extractDateString(testDate2);
      
      // Get initial availability for both days
      const day1InitialSlots = multiProviderAvailability.slots[testDateStr]?.['60'] || [];
      const day2InitialSlots = multiProviderAvailability.slots[testDate2Str]?.['60'] || [];
      
      expect(day1InitialSlots.length).toBeGreaterThan(0);
      expect(day2InitialSlots.length).toBeGreaterThan(0);
      
      // Find available slots on both days
      const day1Slot = day1InitialSlots.find(([, count]) => count === 2);
      const day2Slot = day2InitialSlots.find(([, count]) => count === 2);
      expect(day1Slot).toBeDefined();
      expect(day2Slot).toBeDefined();
      
      const [day1SlotTime] = day1Slot!;
      const [day2SlotTime] = day2Slot!;
      
      // Book a slot on day 1
      const booking = createTestBooking(provider1.id, multiProviderBusiness.id, day1SlotTime, 60);
      
      const manager = new AvailabilityManager(multiProviderAvailability, multiProviderBusiness);
      const updatedAvailability = manager.updateAvailabilityAfterBooking(booking);
      
      // Verify day 1 slot is affected
      const day1UpdatedSlots = updatedAvailability.slots[testDateStr]?.['60'] || [];
      const day1UpdatedSlot = day1UpdatedSlots.find(([time]) => time === day1SlotTime);
      expect(day1UpdatedSlot).toBeDefined();
      expect(day1UpdatedSlot![1]).toBe(1); // Reduced from 2 to 1
      
      // Verify day 2 slots remain completely unchanged
      const day2UpdatedSlots = updatedAvailability.slots[testDate2Str]?.['60'] || [];
      const day2UpdatedSlot = day2UpdatedSlots.find(([time]) => time === day2SlotTime);
      expect(day2UpdatedSlot).toBeDefined();
      expect(day2UpdatedSlot![1]).toBe(2); // Should remain unchanged
      
      // Verify the entire day 2 has the same number of slots
      expect(day2UpdatedSlots.length).toBe(day2InitialSlots.length);
      
      console.log(`Day isolation test: Booking on ${testDateStr} at ${day1SlotTime} did not affect ${testDate2Str} at ${day2SlotTime}`);
    });

    test('should handle completely booked out day - verify empty vs missing slots', () => {
      // Test what happens when an entire day gets booked out
      const initialSlots60 = singleProviderAvailability.slots[testDateStr]?.['60'] || [];
      expect(initialSlots60.length).toBeGreaterThan(0);
      
      let manager = new AvailabilityManager(singleProviderAvailability, singleProviderBusiness);
      let currentAvailability = singleProviderAvailability;
      
      // Book every available slot for the single provider
      const bookingsToMake = initialSlots60.filter(([, count]) => count > 0);
      
      for (const [slotTime] of bookingsToMake) {
        const booking = createTestBooking(singleProvider.id, singleProviderBusiness.id, slotTime, 60);
        manager = new AvailabilityManager(currentAvailability, singleProviderBusiness);
        currentAvailability = manager.updateAvailabilityAfterBooking(booking);
      }
      
      // After booking all slots, verify the day structure
      const finalSlots60 = currentAvailability.slots[testDateStr]?.['60'] || [];
      
      // All slots should be removed (empty array, not missing day)
      expect(finalSlots60).toEqual([]); // Empty array, not undefined
      expect(currentAvailability.slots[testDateStr]).toBeDefined(); // Day still exists
      expect(currentAvailability.slots[testDateStr]['60']).toEqual([]); // But 60-min slots are empty
      
      // Other duration slots should still exist (unless also booked)
      expect(currentAvailability.slots[testDateStr]['30']).toBeDefined();
      expect(currentAvailability.slots[testDateStr]['90']).toBeDefined();
      
      console.log(`Fully booked day test: Day ${testDateStr} 60-min slots completely booked out = empty array [], not missing day`);
    });
  });
});
