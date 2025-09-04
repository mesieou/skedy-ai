import { BaseRepository } from '../base-repository';
import type { Service, CreateServiceData } from '../types/service';
import { ServiceRequirementsGenerator } from '../utils/service-requirements-generator';

export class ServiceRepository extends BaseRepository<Service> {
  constructor() {
    super('services');
  }

  /**
   * Create service with auto-generated AI requirements
   */
    async createWithRequirements(serviceData: CreateServiceData): Promise<Service> {
    // Generate AI function requirements from pricing config
    const { requirements, jobScopeOptions } = ServiceRequirementsGenerator.generateRequirements(
      serviceData as Service
    );

    const serviceWithRequirements = {
      ...serviceData,
      ai_function_requirements: requirements,
      ai_job_scope_options: jobScopeOptions
    };

    return this.create(serviceWithRequirements);
  }
}
