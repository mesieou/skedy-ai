// Availability slots seeder
import { BaseSeeder } from './base-seeder';
import { AvailabilitySlotsRepository } from '../repositories/availability-slots-repository';
import type { AvailabilitySlots } from '../types/availability-slots';
import { DateUtils } from '../../../utils/date-utils';
import type { User } from '../types/user';
import type { CalendarSettings } from '../types/calendar-settings';

export class AvailabilitySlotsSeeder extends BaseSeeder<AvailabilitySlots> {
  constructor() {
    super(new AvailabilitySlotsRepository());
  }

  // Generate availability slots with real data
  async generateAvailabilitySlots(businessId: string, providers: User[], calendarSettings: CalendarSettings[], fromDate: string = DateUtils.addDaysUTC(DateUtils.nowUTC(), 1), days: number = 30): Promise<AvailabilitySlots> {
    const repository = this.repository as AvailabilitySlotsRepository;
    return await repository.generateInitialBusinessAvailability(businessId, fromDate, providers, calendarSettings, days);
  }
}
