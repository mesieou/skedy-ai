import { BaseRepository } from '../base-repository';
import type { AvailabilitySlots } from '../types/availability-slots';

export class AvailabilitySlotsRepository extends BaseRepository<AvailabilitySlots> {
  constructor() {
    super('availability_slots'); // Table name (plural)
  }
}
