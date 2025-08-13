import { BaseRepository } from '../base-repository';
import type { Service, CreateServiceWithPricingData } from '../types/service';
import type { PriceComponent } from '../types/price-components';
import type { PriceComponentTier } from '../types/price-component-tiers';

export class ServiceRepository extends BaseRepository<Service> {
  constructor() {
    super('services'); // Table name (plural)
  }

  async createWithPricing(
    data: CreateServiceWithPricingData,
    priceComponentRepo: BaseRepository<PriceComponent>,
    priceComponentTierRepo: BaseRepository<PriceComponentTier>
  ): Promise<Service> {
      // 1. Create the service first
      const service = await this.create(data.service);
      
      // 2. Create price components and their tiers
      for (const priceComponentData of data.priceComponents) {
          // Create price component with service_id
          const priceComponent = await priceComponentRepo.create({
            ...priceComponentData.component,
            service_id: service.id
          });
          
          // Create tiers for this component
          for (const tierData of priceComponentData.tiers) {
            await priceComponentTierRepo.create({
              ...tierData,
              price_component_id: priceComponent.id
            });
          }
        }
      return service;
  }
}
