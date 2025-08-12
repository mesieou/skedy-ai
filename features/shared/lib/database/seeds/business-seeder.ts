// Business seeder with removalist data
import { BaseSeeder } from './base-seeder';
import { BusinessRepository } from '../repositories/business-repository';
import type { Business } from '../types/business';
import { removalistBusinessData } from './data/business-data';

export class BusinessSeeder extends BaseSeeder<Business> {
  constructor() {
    super(new BusinessRepository());
  }

  // Create removalist business specifically
  async createRemovalist(overrides: Partial<Omit<Business, 'id' | 'created_at' | 'updated_at'>> = {}): Promise<Business> {
    return await this.createWith(removalistBusinessData, overrides);
  }
}
