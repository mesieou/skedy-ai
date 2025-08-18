import { AvailabilityManager } from '../../../lib/availability/availability-manager';
import { 
  findBusinessesNeedingRollover,
  rolloverBusinessesAvailability,
  rolloverSingleBusinessAvailability,
  generateAvailabilitySlotsForDate
} from '../../../utils/availability-helpers';
import { BusinessSeeder } from '../../../../shared/lib/database/seeds/business-seeder';
import { UserSeeder } from '../../../../shared/lib/database/seeds/user-seeder';
import { AuthUserSeeder } from '../../../../shared/lib/database/seeds/auth-user-seeder';
import { CalendarSettingsSeeder } from '../../../../shared/lib/database/seeds/calendar-settings-seeder';
import { AvailabilitySlotsSeeder } from '../../../../shared/lib/database/seeds/availability-slots-seeder';
import { AvailabilitySlotsRepository } from '../../../../shared/lib/database/repositories/availability-slots-repository';

// Test data imports
import { 
  createUniqueRemovalistBusinessData,
  createUniqueMobileManicuristBusinessData
} from '../../../../shared/lib/database/seeds/data/business-data';



import {
  weekdayCalendarSettingsData,
  weekendCalendarSettingsData
} from '../../../../shared/lib/database/seeds/data/calendar-settings-data';



import type { Business } from '../../../../shared/lib/database/types/business';
import type { User } from '../../../../shared/lib/database/types/user';
import type { CalendarSettings } from '../../../../shared/lib/database/types/calendar-settings';
import type { AvailabilitySlots } from '../../../../shared/lib/database/types/availability-slots';
import { DateUtils } from '../../../../shared/utils/date-utils';

// Test constants
const TEST_TIMEOUT = 30000;
const AVAILABILITY_GENERATION_DAYS = 5;

describe('Availability Rollover Functions', () => {
  jest.setTimeout(TEST_TIMEOUT);

  let businessSeeder: BusinessSeeder;
  let userSeeder: UserSeeder;
  let authUserSeeder: AuthUserSeeder;
  let calendarSettingsSeeder: CalendarSettingsSeeder;
  let availabilitySlotsSeeder: AvailabilitySlotsSeeder;

  // Test data containers
  let melbourneBusiness: Business;
  let sydneyBusiness: Business;
  let londonBusiness: Business;
  let provider1: User;
  let provider2: User;
  let provider3: User;
  let calendarSettings1: CalendarSettings;
  let calendarSettings2: CalendarSettings;
  let calendarSettings3: CalendarSettings;
  let availabilitySlots1: AvailabilitySlots;

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
    // Create businesses in different timezones
    melbourneBusiness = await businessSeeder.createBusinessWith({
      ...createUniqueRemovalistBusinessData(),
      name: "Melbourne Business",
      time_zone: "Australia/Melbourne"
    });

    sydneyBusiness = await businessSeeder.createBusinessWith({
      ...createUniqueMobileManicuristBusinessData(),
      name: "Sydney Business", 
      time_zone: "Australia/Sydney"
    });

    londonBusiness = await businessSeeder.createBusinessWith({
      ...createUniqueRemovalistBusinessData(),
      name: "London Business",
      time_zone: "Europe/London"
    });

    // Create providers for each business
    provider1 = await userSeeder.createUniqueAdminProviderUser(melbourneBusiness.id);

    provider2 = await userSeeder.createUniqueProviderUser(sydneyBusiness.id);

    provider3 = await userSeeder.createUniqueAdminProviderUser(londonBusiness.id);

    // Create calendar settings
    calendarSettings1 = await calendarSettingsSeeder.createCalendarSettingsWith({
      ...weekdayCalendarSettingsData,
      user_id: provider1.id
    });

    calendarSettings2 = await calendarSettingsSeeder.createCalendarSettingsWith({
      ...weekendCalendarSettingsData,
      user_id: provider2.id
    });

    calendarSettings3 = await calendarSettingsSeeder.createCalendarSettingsWith({
      ...weekdayCalendarSettingsData,
      user_id: provider3.id
    });

    // Generate initial availability slots
    const startDate = DateUtils.nowUTC();
    
    availabilitySlots1 = await availabilitySlotsSeeder.generateAvailabilitySlots(
      melbourneBusiness.id,
      [provider1],
      [calendarSettings1],
      startDate,
      AVAILABILITY_GENERATION_DAYS
    );

    await availabilitySlotsSeeder.generateAvailabilitySlots(
      sydneyBusiness.id,
      [provider2],
      [calendarSettings2],
      startDate,
      AVAILABILITY_GENERATION_DAYS
    );

    await availabilitySlotsSeeder.generateAvailabilitySlots(
      londonBusiness.id,
      [provider3],
      [calendarSettings3],
      startDate,
      AVAILABILITY_GENERATION_DAYS
    );

    console.log('Test data setup complete:', {
      businesses: [melbourneBusiness.name, sydneyBusiness.name, londonBusiness.name],
      providers: [provider1.email, provider2.email, provider3.email],
      availabilityDates: Object.keys(availabilitySlots1.slots)
    });
  }

  describe('findBusinessesNeedingRollover', () => {
    test('should find businesses at midnight in their timezone', async () => {
      // Test with a specific UTC time that should be midnight in Melbourne (UTC+11 in summer)
      // Melbourne midnight = 13:00 UTC (during daylight saving)
      const melbourneMidnightUTC = "2025-01-15T13:00:00.000Z";
      
      const businesses = await findBusinessesNeedingRollover(melbourneMidnightUTC);
      
      // Should find Melbourne business
      const melbourneFound = businesses.some(b => b.id === melbourneBusiness.id);
      expect(melbourneFound).toBe(true);
      
      console.log(`Found ${businesses.length} businesses needing rollover at Melbourne midnight`);
    });

    test('should find multiple businesses at different UTC times', async () => {
      // Test London midnight (UTC+0)
      const londonMidnightUTC = "2025-01-15T00:00:00.000Z";
      
      const londonBusinesses = await findBusinessesNeedingRollover(londonMidnightUTC);
      const londonFound = londonBusinesses.some(b => b.id === londonBusiness.id);
      expect(londonFound).toBe(true);
      
      console.log(`Found London business at UTC midnight: ${londonFound}`);
    });

    test('should return empty array when no businesses need rollover', async () => {
      // Use a time that shouldn't be midnight anywhere
      const randomTime = "2025-01-15T07:30:00.000Z";
      
      const businesses = await findBusinessesNeedingRollover(randomTime);
      expect(businesses).toEqual([]);
      
      console.log(`No businesses found at random time: ${randomTime}`);
    });
  });

  describe('generateAvailabilitySlotsForDate', () => {
    test('should generate availability slots for a single date', async () => {
      const testDate = "2025-01-20T00:00:00.000Z";
      
      const slots = await generateAvailabilitySlotsForDate(
        [provider1],
        [calendarSettings1],
        testDate
      );

      // Check that slots were generated for all duration intervals
      expect(slots).toBeDefined();
      expect(slots['30']).toBeDefined();
      expect(slots['60']).toBeDefined();
      expect(slots['90']).toBeDefined();
      expect(slots['120']).toBeDefined();
      
      // Check that slots have the correct format [time, count]
      expect(Array.isArray(slots['60'])).toBe(true);
      if (slots['60'].length > 0) {
        const [time, count] = slots['60'][0];
        expect(typeof time).toBe('string');
        expect(typeof count).toBe('number');
        expect(time).toMatch(/^\d{2}:\d{2}$/); // Format: "HH:MM"
      }

      console.log(`Generated slots for ${testDate}:`, {
        '30': slots['30']?.length || 0,
        '60': slots['60']?.length || 0,
        '90': slots['90']?.length || 0,
        '120': slots['120']?.length || 0
      });
    });

    test('should handle multiple providers correctly', async () => {
      const testDate = "2025-01-21T00:00:00.000Z";
      
      const slots = await generateAvailabilitySlotsForDate(
        [provider2, provider3],
        [calendarSettings2, calendarSettings3],
        testDate
      );

      // With multiple providers, counts should be higher where schedules overlap
      expect(slots['60']).toBeDefined();
      
      // Find slots where both providers are available (count = 2)
      const overlappingSlots = slots['60'].filter(([, count]) => count === 2);
      const singleProviderSlots = slots['60'].filter(([, count]) => count === 1);
      
      console.log(`Multi-provider slots:`, {
        overlapping: overlappingSlots.length,
        singleProvider: singleProviderSlots.length,
        total: slots['60'].length
      });
    });
  });

  describe('rolloverSingleBusinessAvailability', () => {
    test('should ensure at least 30 days and remove old dates', async () => {
      // Get initial availability dates
      const initialDates = Object.keys(availabilitySlots1.slots).sort();
      const currentUtcTime = DateUtils.nowUTC();
      const todayDateStr = DateUtils.extractDateString(currentUtcTime);
      
      console.log(`Initial dates: ${initialDates.join(', ')}`);
      console.log(`Today: ${todayDateStr}`);

      // Perform rollover
      await rolloverSingleBusinessAvailability(melbourneBusiness);

      // Fetch updated availability slots
      const availabilitySlotsRepository = new AvailabilitySlotsRepository();
      const updatedSlots = await availabilitySlotsRepository.findOne({ 
        business_id: melbourneBusiness.id 
      });

      expect(updatedSlots).toBeDefined();
      const updatedDates = Object.keys(updatedSlots!.slots).sort();
      const futureDates = updatedDates.filter(date => date >= todayDateStr);
      
      // Should have at least 30 future dates (including today)
      expect(futureDates.length).toBeGreaterThanOrEqual(30);
      
      // Should not contain any dates before today
      const pastDates = updatedDates.filter(date => date < todayDateStr);
      expect(pastDates.length).toBe(0);
      
      // Should start from today or later (string comparison)
      expect(futureDates[0] >= todayDateStr).toBe(true);
      
      console.log(`After rollover: ${futureDates.length} future dates from ${futureDates[0]} to ${futureDates[futureDates.length - 1]}`);
    });

    test('should maintain availability structure after rollover', async () => {
      // Perform rollover
      await rolloverSingleBusinessAvailability(sydneyBusiness);

      // Fetch updated availability
      const availabilitySlotsRepository = new AvailabilitySlotsRepository();
      const updatedSlots = await availabilitySlotsRepository.findOne({ 
        business_id: sydneyBusiness.id 
      });

      expect(updatedSlots).toBeDefined();
      const dates = Object.keys(updatedSlots!.slots);
      const currentUtcTime = DateUtils.nowUTC();
      const todayDateStr = DateUtils.extractDateString(currentUtcTime);
      const futureDates = dates.filter(date => date >= todayDateStr);
      
      // Should have at least 30 future dates
      expect(futureDates.length).toBeGreaterThanOrEqual(30);
      
      // Check that each date has all duration intervals
      futureDates.forEach(date => {
        const daySlots = updatedSlots!.slots[date];
        expect(daySlots['30']).toBeDefined();
        expect(daySlots['60']).toBeDefined();
        expect(daySlots['90']).toBeDefined();
        expect(daySlots['120']).toBeDefined();
        expect(daySlots['150']).toBeDefined();
        expect(daySlots['180']).toBeDefined();
      });

      console.log(`Availability structure maintained for ${futureDates.length} future dates`);
    });

    test('should handle business with no providers gracefully', async () => {
      // Create business without providers
      const emptyBusiness = await businessSeeder.createBusinessWith({
        ...createUniqueRemovalistBusinessData(),
        name: "Empty Business",
        time_zone: "UTC"
      });

      // Should not throw error
      await expect(rolloverSingleBusinessAvailability(emptyBusiness)).resolves.not.toThrow();
      
      console.log(`Handled business without providers gracefully`);
    });

    test('should handle cron job failures by cleaning up multiple old dates', async () => {
      // Simulate old availability slots with dates before today
      const availabilitySlotsRepository = new AvailabilitySlotsRepository();
      const currentSlots = await availabilitySlotsRepository.findOne({ 
        business_id: melbourneBusiness.id 
      });
      
      if (currentSlots) {
        const currentUtcTime = DateUtils.nowUTC();
        const todayDateStr = DateUtils.extractDateString(currentUtcTime);
        
        // Add some old dates to simulate missed cron jobs
        const testSlots = { ...currentSlots.slots };
        const oldDate1 = DateUtils.extractDateString(DateUtils.addDaysUTC(currentUtcTime, -5));
        const oldDate2 = DateUtils.extractDateString(DateUtils.addDaysUTC(currentUtcTime, -3));
        const oldDate3 = DateUtils.extractDateString(DateUtils.addDaysUTC(currentUtcTime, -1));
        
        testSlots[oldDate1] = { '60': [['09:00', 1]], '90': [['09:00', 1]] };
        testSlots[oldDate2] = { '60': [['10:00', 1]], '90': [['10:00', 1]] };
        testSlots[oldDate3] = { '60': [['11:00', 1]], '90': [['11:00', 1]] };
        
        // Update with old dates
        await availabilitySlotsRepository.updateOne(
          { id: currentSlots.id },
          { slots: testSlots }
        );
        
        console.log(`Added old dates: ${oldDate1}, ${oldDate2}, ${oldDate3}`);
        
        // Perform rollover
        await rolloverSingleBusinessAvailability(melbourneBusiness);
        
        // Verify old dates are cleaned up
        const updatedSlots = await availabilitySlotsRepository.findOne({ 
          business_id: melbourneBusiness.id 
        });
        
        expect(updatedSlots).toBeDefined();
        const finalDates = Object.keys(updatedSlots!.slots);
        const futureDates = finalDates.filter(date => date >= todayDateStr);
        const pastDates = finalDates.filter(date => date < todayDateStr);
        
        // Should have cleaned up all old dates
        expect(pastDates.length).toBe(0);
        expect(futureDates.length).toBeGreaterThanOrEqual(30);
        
        // Should not contain the old dates we added
        expect(finalDates).not.toContain(oldDate1);
        expect(finalDates).not.toContain(oldDate2);
        expect(finalDates).not.toContain(oldDate3);
        
        console.log(`Cleaned up old dates. Final: ${futureDates.length} future dates, 0 past dates`);
      }
    });
  });

  describe('rolloverBusinessesAvailability', () => {
    test('should rollover multiple businesses in parallel', async () => {
      const businesses = [melbourneBusiness, sydneyBusiness, londonBusiness];
      
      // Get initial state
      const availabilitySlotsRepository = new AvailabilitySlotsRepository();
      const initialStates = await Promise.all(
        businesses.map(b => availabilitySlotsRepository.findOne({ business_id: b.id }))
      );

      const initialDateCounts = initialStates.map(slots => 
        slots ? Object.keys(slots.slots).length : 0
      );

      // Perform rollover for all businesses
      await rolloverBusinessesAvailability(businesses);

      // Check that all businesses were updated
      const updatedStates = await Promise.all(
        businesses.map(b => availabilitySlotsRepository.findOne({ business_id: b.id }))
      );

      const updatedDateCounts = updatedStates.map(slots => 
        slots ? Object.keys(slots.slots).length : 0
      );

      // Each business should have at least 30 future dates
      const currentUtcTime = DateUtils.nowUTC();
      const todayDateStr = DateUtils.extractDateString(currentUtcTime);
      
      updatedStates.forEach((slots, index) => {
        if (slots) {
          const futureDates = Object.keys(slots.slots).filter(date => date >= todayDateStr);
          expect(futureDates.length).toBeGreaterThanOrEqual(30);
          console.log(`Business ${index}: ${futureDates.length} future dates`);
        }
      });

      console.log(`Rolled over ${businesses.length} businesses:`, {
        initial: initialDateCounts,
        updated: updatedDateCounts
      });
    });
  });

  describe('AvailabilityManager.orchestrateAvailabilityRollover', () => {
    test('should orchestrate complete rollover process', async () => {
      // Test with Melbourne midnight time
      const melbourneMidnightUTC = "2025-01-15T13:00:00.000Z";
      
      // Get initial state
      const availabilitySlotsRepository = new AvailabilitySlotsRepository();
      const initialSlots = await availabilitySlotsRepository.findOne({ 
        business_id: melbourneBusiness.id 
      });
      const initialDates = Object.keys(initialSlots!.slots);

      // Orchestrate rollover
      await AvailabilityManager.orchestrateAvailabilityRollover(melbourneMidnightUTC);

      // Check that Melbourne business was updated
      const updatedSlots = await availabilitySlotsRepository.findOne({ 
        business_id: melbourneBusiness.id 
      });
      const updatedDates = Object.keys(updatedSlots!.slots);

      // Should have at least 30 future dates after rollover
      const currentUtcTime = DateUtils.nowUTC();
      const todayDateStr = DateUtils.extractDateString(currentUtcTime);
      const futureDates = updatedDates.filter(date => date >= todayDateStr);
      
      // Rollover should ensure at least 30 future dates
      expect(futureDates.length).toBeGreaterThanOrEqual(30);
      
      // Should not have past dates
      const pastDates = updatedDates.filter(date => date < todayDateStr);
      expect(pastDates.length).toBe(0);

      console.log(`Orchestrated rollover:`, {
        initial: initialDates.length,
        updated: updatedDates.length,
        firstDate: { initial: initialDates[0], updated: updatedDates[0] },
        lastDate: { initial: initialDates[initialDates.length - 1], updated: updatedDates[updatedDates.length - 1] }
      });
    });

    test('should handle no businesses needing rollover', async () => {
      // Use a time when no business needs rollover
      const randomTime = "2025-01-15T03:30:00.000Z";
      
      // Should complete without error
      await expect(
        AvailabilityManager.orchestrateAvailabilityRollover(randomTime)
      ).resolves.not.toThrow();

      console.log(`Handled no-rollover scenario gracefully`);
    });
  });

  describe('DateUtils timezone functions', () => {
    test('should correctly identify midnight in different timezones', () => {
      // Melbourne midnight (UTC+11 in summer)
      const melbourneMidnight = "2025-01-15T13:00:00.000Z";
      expect(DateUtils.isMidnightInTimezone(melbourneMidnight, "Australia/Melbourne")).toBe(true);
      
      // London midnight (UTC+0)
      const londonMidnight = "2025-01-15T00:00:00.000Z";
      expect(DateUtils.isMidnightInTimezone(londonMidnight, "Europe/London")).toBe(true);
      
      // Sydney midnight (same as Melbourne in summer)
      const sydneyMidnight = "2025-01-15T13:00:00.000Z";
      expect(DateUtils.isMidnightInTimezone(sydneyMidnight, "Australia/Sydney")).toBe(true);

      console.log('Timezone midnight detection working correctly');
    });

    test('should get next availability date correctly', () => {
      const existingSlots = {
        "2025-01-15": {},
        "2025-01-16": {},
        "2025-01-17": {}
      };

      const nextDate = DateUtils.getNextAvailabilityDate(existingSlots);
      expect(nextDate).toBe("2025-01-18");

      console.log(`Next availability date: ${nextDate}`);
    });

    test('should get yesterday date correctly', () => {
      const today = "2025-01-15T10:00:00.000Z";
      const yesterday = DateUtils.getYesterdayUTC(today);
      expect(DateUtils.extractDateString(yesterday)).toBe("2025-01-14");

      console.log(`Yesterday from ${today}: ${yesterday}`);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle business with no availability slots', async () => {
      // Create a business without availability slots
      const newBusiness = await businessSeeder.createBusinessWith({
        ...createUniqueRemovalistBusinessData(),
        name: "No Slots Business"
      });

      const newProvider = await userSeeder.createUniqueProviderUser(newBusiness.id);

      await calendarSettingsSeeder.createCalendarSettingsWith({
        ...weekdayCalendarSettingsData,
        user_id: newProvider.id
      });

      // Should handle gracefully (no availability slots to rollover)
      await expect(rolloverSingleBusinessAvailability(newBusiness)).resolves.not.toThrow();

      console.log('Handled business without availability slots');
    });

    test('should handle empty slots object', () => {
      const emptySlots = {};
      const nextDate = DateUtils.getNextAvailabilityDate(emptySlots);
      
      // Should return today's date when no slots exist
      const today = DateUtils.extractDateString(DateUtils.nowUTC());
      expect(nextDate).toBe(today);

      // Test that the returned date is valid
      expect(DateUtils.isValidUTC(`${nextDate}T00:00:00.000Z`)).toBe(true);

      console.log(`Next date for empty slots: ${nextDate}`);
    });

    test('should verify rollover maintains slot format', async () => {
      // Perform rollover
      await rolloverSingleBusinessAvailability(melbourneBusiness);

      // Verify slot format
      const availabilitySlotsRepository = new AvailabilitySlotsRepository();
      const updatedSlots = await availabilitySlotsRepository.findOne({ 
        business_id: melbourneBusiness.id 
      });

      const dates = Object.keys(updatedSlots!.slots);
      const latestDate = dates.sort()[dates.length - 1];
      const latestDateSlots = updatedSlots!.slots[latestDate];

      // Check format of newly added slots
      Object.keys(latestDateSlots).forEach(duration => {
        const slots = latestDateSlots[duration];
        expect(Array.isArray(slots)).toBe(true);
        
        slots.forEach((slot: [string, number]) => {
          expect(Array.isArray(slot)).toBe(true);
          expect(slot.length).toBe(2);
          expect(typeof slot[0]).toBe('string'); // time
          expect(typeof slot[1]).toBe('number'); // count
          expect(slot[0]).toMatch(/^\d{2}:\d{2}$/); // HH:MM format
        });
      });

      console.log(`Verified slot format for new date: ${latestDate}`);
    });
  });
});
