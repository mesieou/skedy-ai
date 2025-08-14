import { BaseSeeder } from './base-seeder';
import { AddressRepository } from '../repositories/address-repository';
import type { Address, CreateAddressData } from '../types/addresses';

export class AddressSeeder extends BaseSeeder<Address> {
  constructor() {
    super(new AddressRepository());
  }

  // Create address with custom data
  async createAddressWith(data: CreateAddressData): Promise<Address> {
    return await this.create(data);
  }
}
