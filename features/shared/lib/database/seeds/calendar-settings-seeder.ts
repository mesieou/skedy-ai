// Business seeder with removalist data
import { BaseSeeder } from './base-seeder';
import { CalendarSettingsRepository } from '../repositories/calendar-settings-repository';
import type { CalendarSettings, CreateCalendarSettingsData } from '../types/calendar-settings';

export class CalendarSettingsSeeder extends BaseSeeder<CalendarSettings> {
  constructor() {
    super(new CalendarSettingsRepository());
  }

  // Create business with custom data
  async createCalendarSettingsWith(data: CreateCalendarSettingsData): Promise<CalendarSettings> {
    return await this.create(data);
  }
}
