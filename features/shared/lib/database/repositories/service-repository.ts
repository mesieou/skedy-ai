import { BaseRepository } from '../base-repository';
import type { Service } from '../types/service';

export class ServiceRepository extends BaseRepository<Service> {
  constructor() {
    super('services');
  }
}
