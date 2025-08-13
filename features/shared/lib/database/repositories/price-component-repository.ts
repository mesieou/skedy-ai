import { BaseRepository } from '../base-repository';
import type { PriceComponent } from '../types/price-components';

export class PriceComponentRepository extends BaseRepository<PriceComponent> {
  constructor() {
    super('price_components'); // Table name (plural)
  }
}
