import { BaseRepository } from '../base-repository';
import type { PriceComponentTier } from '../types/price-component-tiers';

export class PriceComponentTierRepository extends BaseRepository<PriceComponentTier> {
  constructor() {
    super('price_component_tiers'); // Table name (plural)
  }
}
