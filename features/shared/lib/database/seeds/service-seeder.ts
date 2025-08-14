import { BaseSeeder } from './base-seeder';
import { ServiceRepository } from '../repositories/service-repository';
import type { Service, CreateServiceData } from '../types/service';

export class ServiceSeeder extends BaseSeeder<Service> {
  constructor() {
    super(new ServiceRepository());
  }

  // Create service with custom data
  async createServiceWith(data: CreateServiceData): Promise<Service> {
    return await this.create(data);
  }
}