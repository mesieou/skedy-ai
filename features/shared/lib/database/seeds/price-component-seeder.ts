// Business seeder with removalist data
import { BaseSeeder } from './base-seeder';
import { PriceComponentRepository } from '../repositories/price-component-repository';
import type { PriceComponent, CreatePriceComponentData } from '../types/price-components';

export class PriceComponentSeeder extends BaseSeeder<PriceComponent> {
  constructor() {
    super(new PriceComponentRepository());
  }

  // Create business with custom data
  async createPriceComponentWith(data: CreatePriceComponentData): Promise<PriceComponent> {
    return await this.create(data);
  }
}
