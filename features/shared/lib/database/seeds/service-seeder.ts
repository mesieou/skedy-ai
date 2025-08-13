// Service seeder with pricing support
import { BaseSeeder } from './base-seeder';
import { ServiceRepository } from '../repositories/service-repository';
import { BaseRepository } from '../base-repository';
import type { Service, CreateServiceWithPricingData } from '../types/service';
import type { PriceComponent } from '../types/price-components';
import type { PriceComponentTier } from '../types/price-component-tiers';

export class ServiceSeeder extends BaseSeeder<Service> {
  private serviceRepository: ServiceRepository;
  private priceComponentRepo: BaseRepository<PriceComponent>;
  private priceComponentTierRepo: BaseRepository<PriceComponentTier>;

  constructor() {
    const serviceRepo = new ServiceRepository();
    super(serviceRepo);
    this.serviceRepository = serviceRepo;
    this.priceComponentRepo = new BaseRepository<PriceComponent>('price_components');
    this.priceComponentTierRepo = new BaseRepository<PriceComponentTier>('price_component_tiers');
  }

  // Create service with pricing components and tiers
  async createServiceWithPricing(data: CreateServiceWithPricingData): Promise<Service> {
    return await this.serviceRepository.createWithPricing(
      data,
      this.priceComponentRepo,
      this.priceComponentTierRepo
    );
  }
}
