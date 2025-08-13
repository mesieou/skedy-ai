// Business seeder with removalist data
import { BaseSeeder } from './base-seeder';
import { PriceComponentTierRepository } from '../repositories/price-component-tier-repository';
import type { PriceComponentTier, CreatePriceComponentTierData } from '../types/price-component-tiers';

export class PriceComponentTierSeeder extends BaseSeeder<PriceComponentTier> {
  constructor() {
    super(new PriceComponentTierRepository());
  }

  // Create business with custom data
  async createPriceComponentTierWith(data: CreatePriceComponentTierData): Promise<PriceComponentTier> {
    return await this.create(data);
  }
}
