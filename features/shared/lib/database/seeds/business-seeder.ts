// Business seeder with removalist data
import { BaseSeeder } from './base-seeder';
import { BusinessRepository } from '../repositories/business-repository';
import type { Business, CreateBusinessData } from '../types/business';
import { createUniqueRemovalistBusinessData, createUniqueMobileManicuristBusinessData, createUniqueMassageBusinessData, createSkedyBusinessData, createTigaRemovalistBusinessData } from './data/business-data';

export class BusinessSeeder extends BaseSeeder<Business> {
  constructor() {
    super(new BusinessRepository());
  }

  // Create business with custom data
  async createBusinessWith(data: CreateBusinessData): Promise<Business> {
    return await this.create(data);
  }

  // Create unique removalist business for tests (avoids parallel test conflicts)
  async createUniqueRemovalistBusiness(): Promise<Business> {
    return await this.create(createUniqueRemovalistBusinessData());
  }

  // Create unique manicurist business for tests (avoids parallel test conflicts)
  async createUniqueManicuristBusiness(): Promise<Business> {
    return await this.create(createUniqueMobileManicuristBusinessData());
  }

  // Create unique massage business for tests (avoids parallel test conflicts)
  async createUniqueMassageBusiness(): Promise<Business> {
    return await this.create(createUniqueMassageBusinessData());
  }

  // Create Skedy business
  async createSkedyBusiness(): Promise<Business> {
    return await this.create(createSkedyBusinessData());
  }

  // Create Tiga removalist business
  async createTigaRemovalistBusiness(): Promise<Business> {
    return await this.create(createTigaRemovalistBusinessData());
  }
}
