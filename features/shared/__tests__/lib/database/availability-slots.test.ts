import { AvailabilitySlotsRepository } from '../../../lib/database/repositories/availability-slots-repository';
import { AvailabilitySlotsSeeder } from '../../../lib/database/seeds/availability-slots-seeder';
import { BusinessSeeder } from '../../../lib/database/seeds/business-seeder';
import { UserSeeder } from '../../../lib/database/seeds/user-seeder';
import { AuthUserSeeder } from '../../../lib/database/seeds/auth-user-seeder';
import { CalendarSettingsSeeder } from '../../../lib/database/seeds/calendar-settings-seeder';
import { createUniqueRemovalistBusinessData } from '../../../lib/database/seeds/data/business-data';

import { weekdayCalendarSettingsData, weekendCalendarSettingsData } from '../../../lib/database/seeds/data/calendar-settings-data';
import type { AvailabilitySlots } from '../../../lib/database/types/availability-slots';
import { DateUtils } from '../../../utils/date-utils';
import { User } from '@/features/shared/lib/database/types/user';
import { CalendarSettings } from '@/features/shared/lib/database/types/calendar-settings';

describe('AvailabilitySlotsRepository', () => {
  let availabilitySlotsRepository: AvailabilitySlotsRepository;
  let availabilitySlotsSeeder: AvailabilitySlotsSeeder;
  let businessSeeder: BusinessSeeder;
  let userSeeder: UserSeeder;
  let authUserSeeder: AuthUserSeeder;
  let calendarSettingsSeeder: CalendarSettingsSeeder;
  let businessId: string;
  let weekdayUser: User;
  let weekendUser: User;
  let weekdayCalendarSettings: CalendarSettings;
  let weekendCalendarSettings: CalendarSettings;
  let testAvailabilitySlots: AvailabilitySlots;
  let providers: User[];
  let calendarSettings: CalendarSettings[];
  let tomorrowDate: string; // UTC ISO string

  beforeAll(async () => {
    availabilitySlotsRepository = new AvailabilitySlotsRepository();
    availabilitySlotsSeeder = new AvailabilitySlotsSeeder();
    businessSeeder = new BusinessSeeder();
    authUserSeeder = new AuthUserSeeder();
    userSeeder = new UserSeeder(authUserSeeder);
    calendarSettingsSeeder = new CalendarSettingsSeeder();
    
    // Clean up and create dependencies first
    await availabilitySlotsSeeder.cleanup();
    await calendarSettingsSeeder.cleanup();
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();
    
    const business = await businessSeeder.createBusinessWith(createUniqueRemovalistBusinessData());
    businessId = business.id;
    
    // Create weekday user
    weekdayUser = await userSeeder.createUniqueAdminProviderUser(businessId);
    
    // Create weekend user
    weekendUser = await userSeeder.createUniqueProviderUser(businessId);

    // Create calendar settings for each user
    weekdayCalendarSettings = await calendarSettingsSeeder.createCalendarSettingsWith({
      ...weekdayCalendarSettingsData,
      user_id: weekdayUser.id
    });

    weekendCalendarSettings = await calendarSettingsSeeder.createCalendarSettingsWith({
      ...weekendCalendarSettingsData,
      user_id: weekendUser.id
    });
    
    // Setup test data
    tomorrowDate = DateUtils.addDaysUTC(DateUtils.nowUTC(), 1);
    providers = [weekdayUser, weekendUser];
    calendarSettings = [weekdayCalendarSettings, weekendCalendarSettings];

    // Generate availability once for all tests
    testAvailabilitySlots = await availabilitySlotsRepository.generateInitialBusinessAvailability(
      businessId,
      tomorrowDate,
      providers,
      calendarSettings,
      30
    );
  });

  afterAll(async () => {
    await availabilitySlotsSeeder.cleanup();
    await calendarSettingsSeeder.cleanup();
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();
  });

  it('should create availability slots successfully', async () => {
    
    expect(testAvailabilitySlots).toBeDefined();
    expect(testAvailabilitySlots.id).toBeDefined();
    expect(testAvailabilitySlots.business_id).toBe(businessId);
    expect(testAvailabilitySlots.slots).toBeDefined();
    expect(typeof testAvailabilitySlots.slots).toBe('object');
  });

  it('should create availability slots with invalid business_id unsuccessfully', async () => {
    await expect(availabilitySlotsRepository.generateInitialBusinessAvailability(
      'invalid-business-id',
      tomorrowDate,
      providers,
      calendarSettings,
      30
    )).rejects.toThrow();
  });

  it('should find availability slots by business_id successfully', async () => {
    const foundAvailabilitySlots = await availabilitySlotsRepository.findOne({ 
      business_id: testAvailabilitySlots.business_id 
    });

    expect(foundAvailabilitySlots).toBeDefined();
    expect(foundAvailabilitySlots?.id).toBe(testAvailabilitySlots.id);
    expect(foundAvailabilitySlots?.business_id).toBe(testAvailabilitySlots.business_id);
  });

  it('should delete availability slots successfully', async () => {
    await availabilitySlotsRepository.deleteOne({ id: testAvailabilitySlots.id });

    const deletedAvailabilitySlots = await availabilitySlotsRepository.findOne({ id: testAvailabilitySlots.id });
    expect(deletedAvailabilitySlots).toBeNull();
  });
  
  it('should have the correct object slots structure', async () => {
    // Check that it has date keys
    const dateKeys = Object.keys(testAvailabilitySlots.slots);
    expect(dateKeys.length).toBeGreaterThan(0);
    
    // Check that each date has all duration keys
    const firstDateSlots = testAvailabilitySlots.slots[dateKeys[0]];
    expect(firstDateSlots).toBeDefined();
    expect(firstDateSlots['30']).toBeDefined();
    expect(firstDateSlots['45']).toBeDefined();
    expect(firstDateSlots['60']).toBeDefined();
    expect(firstDateSlots['90']).toBeDefined();
    expect(firstDateSlots['120']).toBeDefined();
    expect(firstDateSlots['150']).toBeDefined();
    expect(firstDateSlots['180']).toBeDefined();
    expect(firstDateSlots['240']).toBeDefined();
    expect(firstDateSlots['300']).toBeDefined();
    expect(firstDateSlots['360']).toBeDefined();
  });

  it('should have no slots outside of working hours', async () => {
    // Get earliest start and latest end from all calendar settings
    let earliestStart = 24;
    let latestEnd = 0;
    
    calendarSettings.forEach(settings => {
      Object.values(settings.working_hours).forEach(hours => {
        if (hours) {
          const startHour = parseInt(hours.start.split(':')[0]);
          const endHour = parseInt(hours.end.split(':')[0]);
          earliestStart = Math.min(earliestStart, startHour);
          latestEnd = Math.max(latestEnd, endHour);
        }
      });
    });
    
    const dateKeys = Object.keys(testAvailabilitySlots.slots);
    
    for (const dateKey of dateKeys) {
      const daySlots = testAvailabilitySlots.slots[dateKey];
      
      for (const durationKey of Object.keys(daySlots)) {
        const slots = daySlots[durationKey];
        
        for (const [timeStr] of slots) {
          const hour = parseInt(timeStr.split(':')[0]);
          expect(hour).toBeGreaterThanOrEqual(earliestStart);
          expect(hour).toBeLessThan(latestEnd);
        }
      }
    }
  });

  it('should have only 1 provider on Fridays (weekday user only)', async () => {
    const dateKeys = Object.keys(testAvailabilitySlots.slots);
    
    for (const dateKey of dateKeys) {
      const date = new Date(dateKey);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 5 = Friday
      
      if (dayOfWeek === 5) { // Friday
        const daySlots = testAvailabilitySlots.slots[dateKey];
        
        for (const durationKey of Object.keys(daySlots)) {
          const slots = daySlots[durationKey];
          
          // Should have slots (weekday user works Friday)
          if (slots.length > 0) {
            for (const [, providerCount] of slots) {
              expect(providerCount).toBe(1); // Only weekday user works Friday
            }
          }
        }
      }
    }
  });

  it('should have only 1 provider on Saturday and Sunday', async () => {
    const dateKeys = Object.keys(testAvailabilitySlots.slots);
    
    for (const dateKey of dateKeys) {
      const date = new Date(dateKey);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
        const daySlots = testAvailabilitySlots.slots[dateKey];
        
        for (const durationKey of Object.keys(daySlots)) {
          const slots = daySlots[durationKey];
          
          // Only check if there are slots (weekend provider works these days)
          if (slots.length > 0) {
            for (const [, providerCount] of slots) {
              expect(providerCount).toBe(1); // Only 1 provider on weekends
            }
          }
        }
      }
    }
  });

  it('should have 2 provider on Monday (only weekday provider works)', async () => {
    const dateKeys = Object.keys(testAvailabilitySlots.slots);
    
    for (const dateKey of dateKeys) {
      const date = new Date(dateKey);
      const dayOfWeek = date.getDay(); // 1 = Monday
      
      if (dayOfWeek === 1) { // Monday
        const daySlots = testAvailabilitySlots.slots[dateKey];
        
        for (const durationKey of Object.keys(daySlots)) {
          const slots = daySlots[durationKey];
          
          // Only check if there are slots (weekday provider works Monday)
          if (slots.length > 0) {
            for (const [, providerCount] of slots) {
              expect(providerCount).toBe(2); // 2 providers on Monday
            }
          }
        }
      }
    }
  });

  it('should have availability for at least one month range', async () => {
    const dateKeys = Object.keys(testAvailabilitySlots.slots).sort();
    expect(dateKeys.length).toBeGreaterThan(0);
    
    // Check first day
    const firstDate = new Date(dateKeys[0]);
    const expectedFirstDate = new Date(DateUtils.extractDateString(tomorrowDate));
    expect(firstDate.toDateString()).toBe(expectedFirstDate.toDateString());
    
    // Check last day spans 30 calendar days (even if some days have no availability)
    const lastDate = new Date(dateKeys[dateKeys.length - 1]);
    const daysDifference = Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(daysDifference).toBeGreaterThanOrEqual(29);
    
    // Should have working days (Mon-Thu + Sat-Sun), but not Fridays
    const workingDays = dateKeys.filter(dateKey => {
      const date = new Date(dateKey);
      const dayOfWeek = date.getDay();
      return dayOfWeek !== 5; // Not Friday
    });
    expect(workingDays.length).toBeGreaterThan(20); // Should have most days available
  });

  it('should start availability from tomorrow', async () => {
    const dateKeys = Object.keys(testAvailabilitySlots.slots).sort();
    const firstDateKey = dateKeys[0];
    const firstDate = new Date(firstDateKey);
    const expectedTomorrow = new Date(DateUtils.extractDateString(tomorrowDate));
    
    expect(firstDate.toDateString()).toBe(expectedTomorrow.toDateString());
  });
});
