import { BaseRepository } from '../base-repository';
import type { CalendarSettings } from '../types/calendar-settings';

export class CalendarSettingsRepository extends BaseRepository<CalendarSettings> {
  constructor() {
    super('calendar_settings'); // Table name (plural)
  }
}
