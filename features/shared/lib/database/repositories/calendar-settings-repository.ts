import { BaseRepository } from '../base-repository';
import type { CalendarSettings } from '../types/calendar-settings';

export class CalendarSettingsRepository extends BaseRepository<CalendarSettings> {
  constructor() {
    super('calendar_settings'); // Table name (plural)
  }

  async findByUserIds(userIds: string[]): Promise<CalendarSettings[]> {
    const client = await this.getClient();
    const { data, error } = await client
      .from(this.tableName)
      .select('*')
      .in('user_id', userIds);

    if (error) throw new Error(`Failed to find calendar settings for users: ${error.message}`);
    return (data || []) as CalendarSettings[];
  }
}
