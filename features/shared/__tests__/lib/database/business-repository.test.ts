import { BusinessRepository } from '../../../lib/database/repositories/business-repository';
import { BusinessSeeder } from '../../../lib/database/seeds/business-seeder';
import { createUniqueRemovalistBusinessData } from '../../../lib/database/seeds/data/business-data';
import type { Business } from '../../../lib/database/types/business';

describe('BusinessRepository', () => {
  let repository: BusinessRepository;
  let seeder: BusinessSeeder;
  let testBusiness: Business; // Shared business for all tests

  beforeAll(async () => {
    repository = new BusinessRepository();
    seeder = new BusinessSeeder();
    await seeder.cleanup();
    
    // Create ONE business for all tests with unique data
    testBusiness = await seeder.createBusinessWith(createUniqueRemovalistBusinessData());
  });

  afterAll(async () => {
    await seeder.cleanup();
  });

  describe('CRUD operations', () => {
    it('should create a business', async () => {
      expect(testBusiness).toBeDefined();
      expect(testBusiness.id).toBeDefined();
      expect(testBusiness.name).toContain('Tiga Removals');
      expect(testBusiness.email).toContain('edward+');
      expect(testBusiness.phone_number).toMatch(/^\+61473164\d{3}$/);
      expect(testBusiness.minimum_charge).toBe(200);
      expect(testBusiness.charges_deposit).toBe(true);
      expect(testBusiness.payment_processing_fee_percentage).toBe(2.9);
      expect(testBusiness.booking_platform_fee_percentage).toBe(2.0);
    });

    it('should find business by phone number', async () => {
      const foundBusiness = await repository.findOne({ 
        phone_number: testBusiness.phone_number 
      });

      expect(foundBusiness).toBeDefined();
      expect(foundBusiness?.id).toBe(testBusiness.id);
      expect(foundBusiness?.phone_number).toBe(testBusiness.phone_number);
    });

    it('should update a business', async () => {
      const updatedName = 'Updated Business Name';
      const updatedBusiness = await repository.updateOne(
        { id: testBusiness.id },
        { name: updatedName }
      );

      expect(updatedBusiness.name).toBe(updatedName);
      expect(updatedBusiness.id).toBe(testBusiness.id);
      expect(updatedBusiness.email).toBe(testBusiness.email);
      
      // Reset name back for other tests
      await repository.updateOne({ id: testBusiness.id }, { name: testBusiness.name });
    });

    it('should return null when business not found', async () => {
      const nonExistentBusiness = await repository.findOne({ 
        phone_number: '+999999999999' 
      });

      expect(nonExistentBusiness).toBeNull();
    });

    it('should delete a business by id', async () => {
      // Delete the shared business (run last)
      await repository.deleteOne({ id: testBusiness.id });

      const deletedBusiness = await repository.findOne({ id: testBusiness.id });
      expect(deletedBusiness).toBeNull();
    });
  });
});
