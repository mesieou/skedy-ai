import { CalendarSettingsRepository } from '../../../lib/database/repositories/calendar-settings-repository';
import { CalendarSettingsSeeder } from '../../../lib/database/seeds/calendar-settings-seeder';
import { UserSeeder } from '../../../lib/database/seeds/user-seeder';
import { AuthUserSeeder } from '../../../lib/database/seeds/auth-user-seeder';
import { BusinessSeeder } from '../../../lib/database/seeds/business-seeder';
import { weekdayCalendarSettingsData, weekendCalendarSettingsData } from '../../../lib/database/seeds/data/calendar-settings-data';
import { adminProviderUserData } from '../../../lib/database/seeds/data/user-data';
import { removalistBusinessData } from '../../../lib/database/seeds/data/business-data';
import { adminAuthUserData } from '../../../lib/database/seeds/data/auth-user-data';
import type { CalendarSettings } from '../../../lib/database/types/calendar-settings';

describe('CalendarSettingsRepository', () => {
  let calendarSettingsRepository: CalendarSettingsRepository;
  let calendarSettingsSeeder: CalendarSettingsSeeder;
  let userSeeder: UserSeeder;
  let authUserSeeder: AuthUserSeeder;
  let businessSeeder: BusinessSeeder;
  let businessId: string;
  let userId: string;
  let testWeekdayCalendarSettings: CalendarSettings;
  let testWeekendCalendarSettings: CalendarSettings;

  beforeAll(async () => {
    calendarSettingsRepository = new CalendarSettingsRepository();
    calendarSettingsSeeder = new CalendarSettingsSeeder();
    authUserSeeder = new AuthUserSeeder();
    userSeeder = new UserSeeder(authUserSeeder);
    businessSeeder = new BusinessSeeder();
    
    // Clean up and create dependencies first
    await calendarSettingsSeeder.cleanup();
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();
    
    const business = await businessSeeder.createBusinessWith(removalistBusinessData);
    businessId = business.id;
    
    const user = await userSeeder.createUserWith(
      { ...adminProviderUserData, business_id: businessId },
      adminAuthUserData
    );
    userId = user.id;
  });

  afterAll(async () => {
    await calendarSettingsSeeder.cleanup();
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();
  });

  it('should create calendar settings successfully', async () => {
    testWeekdayCalendarSettings = await calendarSettingsSeeder.createCalendarSettingsWith({
      ...weekdayCalendarSettingsData,
      user_id: userId
    });
    
    expect(testWeekdayCalendarSettings).toBeDefined();
    expect(testWeekdayCalendarSettings.id).toBeDefined();
    expect(testWeekdayCalendarSettings.user_id).toBe(userId);
    expect(testWeekdayCalendarSettings.settings).toEqual(weekdayCalendarSettingsData.settings);
    expect(testWeekdayCalendarSettings.working_hours).toEqual(weekdayCalendarSettingsData.working_hours);
  });

  it('should create calendar settings with different working hours', async () => {
    testWeekendCalendarSettings = await calendarSettingsSeeder.createCalendarSettingsWith({
      ...weekendCalendarSettingsData,
      user_id: userId
    });
    
    expect(testWeekendCalendarSettings).toBeDefined();
    expect(testWeekendCalendarSettings.id).toBeDefined();
    expect(testWeekendCalendarSettings.user_id).toBe(userId);
    expect(testWeekendCalendarSettings.settings).toEqual(weekendCalendarSettingsData.settings);
    expect(testWeekendCalendarSettings.working_hours).toEqual(weekendCalendarSettingsData.working_hours);
  });

  it('should create calendar settings with invalid user_id unsuccessfully', async () => {
    const invalidCalendarSettingsData = {
      ...weekdayCalendarSettingsData,
      user_id: 'invalid-user-id'
    };

    await expect(calendarSettingsRepository.create(invalidCalendarSettingsData)).rejects.toThrow();
  });

  it('should find calendar settings by user_id successfully', async () => {
    const foundCalendarSettings = await calendarSettingsRepository.findOne({ 
      user_id: testWeekdayCalendarSettings.user_id 
    });

    expect(foundCalendarSettings).toBeDefined();
    expect(foundCalendarSettings?.id).toBe(testWeekdayCalendarSettings.id);
    expect(foundCalendarSettings?.user_id).toBe(testWeekdayCalendarSettings.user_id);
  });

  it('should update calendar settings successfully', async () => {
    const updatedSettings = { bufferTime: 45 };
    const updatedCalendarSettings = await calendarSettingsRepository.updateOne(
      { id: testWeekdayCalendarSettings.id },
      { settings: updatedSettings }
    );

    expect(updatedCalendarSettings.settings).toEqual(updatedSettings);
    expect(updatedCalendarSettings.id).toBe(testWeekdayCalendarSettings.id);
    expect(updatedCalendarSettings.user_id).toBe(testWeekdayCalendarSettings.user_id);
  });

  it('should delete calendar settings successfully', async () => {
    await calendarSettingsRepository.deleteOne({ id: testWeekdayCalendarSettings.id });

    const deletedCalendarSettings = await calendarSettingsRepository.findOne({ id: testWeekdayCalendarSettings.id });
    expect(deletedCalendarSettings).toBeNull();
  });
});
