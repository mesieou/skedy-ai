import { BaseRepository } from '../base-repository';
import type { AvailabilitySlots } from '../types/availability-slots';
import { AvailabilityManager } from '@/features/scheduling/lib/availability/availability-manager';
import { User } from '../types/user';
import { CalendarSettings } from '../types/calendar-settings';
import { Business } from '../types/business';

export class AvailabilitySlotsRepository extends BaseRepository<AvailabilitySlots> {
  constructor() {
    super('availability_slots');
  }

  async generateInitialBusinessAvailability(businessId: string, fromDate: string, providers: User[], calendarSettings: CalendarSettings[], days: number = 30): Promise<AvailabilitySlots> {
    const emptySlots: AvailabilitySlots = { slots: {}, business_id: businessId } as AvailabilitySlots;
    const business: Business = { id: businessId } as Business;
    const manager = new AvailabilityManager(emptySlots, business);
    
    // Pass UTC string directly to the manager
    const availabilitySlots = await manager.generateInitialBusinessAvailability(providers, calendarSettings, fromDate, days);
    return this.create(availabilitySlots);
  }
}
