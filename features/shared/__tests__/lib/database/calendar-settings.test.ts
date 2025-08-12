import { CalendarSettingsRepository } from '../../../lib/database/repositories/calendar-settings-repository';
import { CalendarSettingsSeeder } from '../../../lib/database/seeds/calendar-settings-seeder';
import { UserSeeder } from '../../../lib/database/seeds/user-seeder';
import { AuthUserSeeder } from '../../../lib/database/seeds/auth-user-seeder';
import { BusinessSeeder } from '../../../lib/database/seeds/business-seeder';
import { weekdayCalendarSettingsData, weekendCalendarSettingsData } from '../../../lib/database/seeds/data/calendar-settings-data';
import { adminProviderUserData, providerUserData } from '../../../lib/database/seeds/data/user-data';
import { removalistBusinessData } from '../../../lib/database/seeds/data/business-data';
import { adminAuthUserData, providerAuthUserData } from '../../../lib/database/seeds/data/auth-user-data';
import type { CalendarSettings } from '../../../lib/database/types/calendar-settings';

describe('CalendarSettingsRepository', () => {
  let calendarSettingsRepository: CalendarSettingsRepository;
  let calendarSettingsSeeder: CalendarSettingsSeeder;
  let userSeeder: UserSeeder;
  let authUserSeeder: AuthUserSeeder;
  let businessSeeder: BusinessSeeder;
  let businessId: string;
  let weekdayUserId: string;
  let weekendUserId: string;
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
    
    // Create weekday user
    const weekdayUser = await userSeeder.createUserWith(
      { ...adminProviderUserData, business_id: businessId },
      adminAuthUserData
    );
    weekdayUserId = weekdayUser.id;
    
    // Create weekend user
    const weekendUser = await userSeeder.createUserWith(
      { ...providerUserData, business_id: businessId },
      providerAuthUserData
    );
    weekendUserId = weekendUser.id;
  });

  afterAll(async () => {
    await calendarSettingsSeeder.cleanup();
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();
  });

  it('should create weekday calendar settings successfully', async () => {
    testWeekdayCalendarSettings = await calendarSettingsSeeder.createCalendarSettingsWith({
      ...weekdayCalendarSettingsData,
      user_id: weekdayUserId
    });
    
    expect(testWeekdayCalendarSettings).toBeDefined();
    expect(testWeekdayCalendarSettings.id).toBeDefined();
    expect(testWeekdayCalendarSettings.user_id).toBe(weekdayUserId);
    expect(testWeekdayCalendarSettings.settings).toEqual(weekdayCalendarSettingsData.settings);
    expect(testWeekdayCalendarSettings.working_hours).toEqual(weekdayCalendarSettingsData.working_hours);
  });

  it('should create weekend calendar settings successfully', async () => {
    testWeekendCalendarSettings = await calendarSettingsSeeder.createCalendarSettingsWith({
      ...weekendCalendarSettingsData,
      user_id: weekendUserId
    });
    
    expect(testWeekendCalendarSettings).toBeDefined();
    expect(testWeekendCalendarSettings.id).toBeDefined();
    expect(testWeekendCalendarSettings.user_id).toBe(weekendUserId);
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

  it('should find weekday calendar settings by user_id successfully', async () => {
    const foundCalendarSettings = await calendarSettingsRepository.findOne({ 
      user_id: testWeekdayCalendarSettings.user_id 
    });

    expect(foundCalendarSettings).toBeDefined();
    expect(foundCalendarSettings?.id).toBe(testWeekdayCalendarSettings.id);
    expect(foundCalendarSettings?.user_id).toBe(testWeekdayCalendarSettings.user_id);
  });

  it('should find weekend calendar settings by user_id successfully', async () => {
    const foundCalendarSettings = await calendarSettingsRepository.findOne({ 
      user_id: testWeekendCalendarSettings.user_id 
    });

    expect(foundCalendarSettings).toBeDefined();
    expect(foundCalendarSettings?.id).toBe(testWeekendCalendarSettings.id);
    expect(foundCalendarSettings?.user_id).toBe(testWeekendCalendarSettings.user_id);
  });

  it('should update weekday calendar settings successfully', async () => {
    const updatedSettings = { bufferTime: 45 };
    const updatedCalendarSettings = await calendarSettingsRepository.updateOne(
      { id: testWeekdayCalendarSettings.id },
      { settings: updatedSettings }
    );

    expect(updatedCalendarSettings.settings).toEqual(updatedSettings);
    expect(updatedCalendarSettings.id).toBe(testWeekdayCalendarSettings.id);
    expect(updatedCalendarSettings.user_id).toBe(testWeekdayCalendarSettings.user_id);
  });

  it('should update weekend calendar settings successfully', async () => {
    const updatedSettings = { bufferTime: 60 };
    const updatedCalendarSettings = await calendarSettingsRepository.updateOne(
      { id: testWeekendCalendarSettings.id },
      { settings: updatedSettings }
    );

    expect(updatedCalendarSettings.settings).toEqual(updatedSettings);
    expect(updatedCalendarSettings.id).toBe(testWeekendCalendarSettings.id);
    expect(updatedCalendarSettings.user_id).toBe(testWeekendCalendarSettings.user_id);
  });

  it('should delete weekday calendar settings successfully', async () => {
    await calendarSettingsRepository.deleteOne({ id: testWeekdayCalendarSettings.id });

    const deletedCalendarSettings = await calendarSettingsRepository.findOne({ id: testWeekdayCalendarSettings.id });
    expect(deletedCalendarSettings).toBeNull();
  });

  it('should delete weekend calendar settings successfully', async () => {
    await calendarSettingsRepository.deleteOne({ id: testWeekendCalendarSettings.id });

    const deletedCalendarSettings = await calendarSettingsRepository.findOne({ id: testWeekendCalendarSettings.id });
    expect(deletedCalendarSettings).toBeNull();
  });
});
