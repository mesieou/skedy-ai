// Service seeder with JSON pricing support
import { BaseSeeder } from './base-seeder';
import { ServiceRepository } from '../repositories/service-repository';
import type { Service, CreateServiceData } from '../types/service';

export class ServiceSeeder extends BaseSeeder<Service> {
  private serviceRepository: ServiceRepository;

  constructor() {
    const serviceRepo = new ServiceRepository();
    super(serviceRepo);
    this.serviceRepository = serviceRepo;
  }

  // Create service with JSON pricing config
  async createServiceWithPricing(data: CreateServiceData): Promise<Service> {
    return await this.serviceRepository.create(data);
  }
}
