import { BaseRepository } from '../base-repository';
import type { AvailabilitySlots } from '../types/availability-slots';
import { DateTime } from 'luxon';
import { AvailabilityManager } from '@/features/scheduling/lib/services/availability-manager';
import { User } from '../types/user';
import { CalendarSettings } from '../types/calendar-settings';
import { Business } from '../types/business';

export class AvailabilitySlotsRepository extends BaseRepository<AvailabilitySlots> {
  constructor() {
    super('availability_slots'); // Table name (plural)
  }

  async generateInitialBusinessAvailability(businessId: string, fromDate: DateTime, providers: User[], calendarSettings: CalendarSettings[], days: number = 30): Promise<AvailabilitySlots> {
    const emptySlots: AvailabilitySlots = { slots: {}, business_id: businessId } as AvailabilitySlots;
    const business: Business = { id: businessId } as Business;
    const manager = new AvailabilityManager(emptySlots, business);
    
    const availabilitySlots = await manager.generateInitialBusinessAvailability(providers, calendarSettings, fromDate, days);
    return this.create(availabilitySlots);
  }
}
