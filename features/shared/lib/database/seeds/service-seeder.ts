import { BaseSeeder } from './base-seeder';
import { ServiceRepository } from '../repositories/service-repository';
import type { Service, CreateServiceData } from '../types/service';

export class ServiceSeeder extends BaseSeeder<Service> {
  private serviceRepo: ServiceRepository;

  constructor() {
    const repo = new ServiceRepository();
    super(repo);
    this.serviceRepo = repo;
  }

  // Create service with custom data (without AI requirements)
  async createServiceWith(data: CreateServiceData): Promise<Service> {
    const serviceWithDefaults = {
      ...data,
      ai_function_requirements: [],
      ai_job_scope_options: null
    };
    return await this.create(serviceWithDefaults);
  }

  // Create service with auto-generated AI requirements
  async createWithRequirements(data: CreateServiceData): Promise<Service> {
    return await this.serviceRepo.createWithRequirements(data);
  }
}
