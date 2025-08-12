// Business seeder with removalist data
import { BaseSeeder } from './base-seeder';
import { BusinessRepository } from '../repositories/business-repository';
import type { Business, CreateBusinessData } from '../types/business';

export class BusinessSeeder extends BaseSeeder<Business> {
  constructor() {
    super(new BusinessRepository());
  }

  // Create business with custom data
  async createBusinessWith(data: CreateBusinessData): Promise<Business> {
    return await this.create(data);
  }
}
