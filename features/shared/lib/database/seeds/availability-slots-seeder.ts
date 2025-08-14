// Availability slots seeder
import { BaseSeeder } from './base-seeder';
import { AvailabilitySlotsRepository } from '../repositories/availability-slots-repository';
import type { AvailabilitySlots } from '../types/availability-slots';
import { DateTime } from 'luxon';
import { Provider } from '@/features/scheduling/lib/types/availability-manager';

export class AvailabilitySlotsSeeder extends BaseSeeder<AvailabilitySlots> {
  constructor() {
    super(new AvailabilitySlotsRepository());
  }

  // Generate availability slots with real data
  async generateAvailabilitySlots(businessId: string, providers: Provider[], fromDate: DateTime = DateTime.now().plus({ days: 1 }), days: number = 30): Promise<AvailabilitySlots> {
    const repository = this.repository as AvailabilitySlotsRepository;
    return await repository.generateInitialBusinessAvailability(businessId, fromDate, providers, days);
  }
}
