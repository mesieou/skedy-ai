import { BaseRepository } from '../base-repository';
import type { Address } from '../types/addresses';

export class AddressRepository extends BaseRepository<Address> {
  constructor() {
    super('addresses');
  }
}
