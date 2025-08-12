import { BaseRepository } from '../base-repository';
import type { Business } from '../types/business';

export class BusinessRepository extends BaseRepository<Business> {
  constructor() {
    super('businesses'); // Table name (plural)
  }
}
