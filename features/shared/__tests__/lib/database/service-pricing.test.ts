import { BusinessSeeder } from '../../../lib/database/seeds/business-seeder';
import { ServiceSeeder } from '../../../lib/database/seeds/service-seeder';
import { BaseRepository } from '../../../lib/database/base-repository';
import { removalistBusinessData } from '../../../lib/database/seeds/data/business-data';
import { 
  removalServiceData, 
  manicureServiceData 
} from '../../../lib/database/seeds/data/services-data';
import {
  hourlyRateComponentDataForRemovalists,
  distanceComponentDataForRemovalists,
  manicureComponentData
} from '../../../lib/database/seeds/data/price-components-data';
import {
  hourlyServiceTierDataOneMover,
  hourlyServiceTierDataTwoMovers,
  hourlyServiceTierDataThreeMovers,
  fixedManicureServiceTierData
} from '../../../lib/database/seeds/data/price-component-tiers-data';
import type { Business } from '../../../lib/database/types/business';
import type { Service } from '../../../lib/database/types/service';
import type { PriceComponent } from '../../../lib/database/types/price-components';
import type { PriceComponentTier } from '../../../lib/database/types/price-component-tiers';

describe('Service Pricing Tests', () => {
  let businessSeeder: BusinessSeeder;
  let serviceSeeder: ServiceSeeder;
  let priceComponentRepo: BaseRepository<PriceComponent>;
  let priceComponentTierRepo: BaseRepository<PriceComponentTier>;
  
  let createdBusiness: Business;
  let createdRemovalService: Service;
  let createdManicureService: Service;

  beforeAll(async () => {
    businessSeeder = new BusinessSeeder();
    serviceSeeder = new ServiceSeeder();
    priceComponentRepo = new BaseRepository<PriceComponent>('price_components');
    priceComponentTierRepo = new BaseRepository<PriceComponentTier>('price_component_tiers');
  });

  afterAll(async () => {
    // Delete everything created
    if (createdRemovalService) {
      await cleanupService(createdRemovalService.id);
    }
    if (createdManicureService) {
      await cleanupService(createdManicureService.id);
    }
    if (createdBusiness) {
      await businessSeeder['repository'].deleteOne({ id: createdBusiness.id });
    }
  });

  async function cleanupService(serviceId: string) {
    const components = await priceComponentRepo.findAll({}, { service_id: serviceId });
    for (const component of components) {
      const tiers = await priceComponentTierRepo.findAll({}, { price_component_id: component.id });
      for (const tier of tiers) {
        await priceComponentTierRepo.deleteOne({ id: tier.id });
      }
      await priceComponentRepo.deleteOne({ id: component.id });
    }
    await serviceSeeder['repository'].deleteOne({ id: serviceId });
  }

  describe('Setup and Creation', () => {
    test('should create removalist business', async () => {
      createdBusiness = await businessSeeder.createBusinessWith(removalistBusinessData);
      
      expect(createdBusiness).toBeDefined();
      expect(createdBusiness.id).toBeDefined();
      expect(createdBusiness.name).toBe(removalistBusinessData.name);
      expect(createdBusiness.business_category).toBe('transport');
    });

    test('should create removal service with pricing components and tiers', async () => {
      // Prepare service data with business_id
      const serviceWithPricing = {
        service: {
          ...removalServiceData,
          business_id: createdBusiness.id
        },
        priceComponents: [
          {
            component: hourlyRateComponentDataForRemovalists,
            tiers: [
              hourlyServiceTierDataOneMover,
              hourlyServiceTierDataTwoMovers,
              hourlyServiceTierDataThreeMovers
            ]
          },
          {
            component: distanceComponentDataForRemovalists,
            tiers: [
              hourlyServiceTierDataOneMover,
              hourlyServiceTierDataTwoMovers,
              hourlyServiceTierDataThreeMovers
            ]
          }
        ]
      };

      createdRemovalService = await serviceSeeder.createServiceWithPricing(serviceWithPricing);
      
      expect(createdRemovalService).toBeDefined();
      expect(createdRemovalService.id).toBeDefined();
      expect(createdRemovalService.name).toBe(removalServiceData.name);
      expect(createdRemovalService.business_id).toBe(createdBusiness.id);
      expect(createdRemovalService.has_price_components).toBe(true);
      expect(createdRemovalService.minimum_charge).toBe(200);

      // Test components were created
      const serviceComponents = await priceComponentRepo.findAll({}, { service_id: createdRemovalService.id });
      expect(serviceComponents).toHaveLength(2);
      
      const hourlyComponent = serviceComponents.find(c => c.name === 'Hourly Rate');
      const distanceComponent = serviceComponents.find(c => c.name === 'Distance Fee');
      expect(hourlyComponent).toBeDefined();
      expect(distanceComponent).toBeDefined();
      expect(hourlyComponent!.pricing_method).toBe('hourly');
      expect(hourlyComponent!.tier_unit_label).toBe('movers');
      expect(distanceComponent!.pricing_method).toBe('per_minute');
      expect(distanceComponent!.tier_unit_label).toBe('movers');

      // Test tiers were created for each component
      const hourlyTiers = await priceComponentTierRepo.findAll({}, { price_component_id: hourlyComponent!.id });
      const distanceTiers = await priceComponentTierRepo.findAll({}, { price_component_id: distanceComponent!.id });
      
      expect(hourlyTiers).toHaveLength(3);
      expect(distanceTiers).toHaveLength(3);
      
      // Test specific tier values
      const oneMoverTier = hourlyTiers.find(t => t.min_quantity === 1 && t.max_quantity === 1);
      const twoMoversTier = hourlyTiers.find(t => t.min_quantity === 2 && t.max_quantity === 2);
      const threeMoversTier = hourlyTiers.find(t => t.min_quantity === 3 && t.max_quantity === 3);
      
      expect(oneMoverTier).toBeDefined();
      expect(twoMoversTier).toBeDefined();
      expect(threeMoversTier).toBeDefined();
      expect(oneMoverTier!.price).toBe(95.00);
      expect(twoMoversTier!.price).toBe(145.00);
      expect(threeMoversTier!.price).toBe(185.00);
    });

    test('should create manicure service with pricing components and tiers', async () => {
      // Prepare service data with business_id
      const serviceWithPricing = {
        service: {
          ...manicureServiceData,
          business_id: createdBusiness.id,
          has_price_components: true // Override to true since we're adding components
        },
        priceComponents: [
          {
            component: manicureComponentData,
            tiers: [fixedManicureServiceTierData]
          }
        ]
      };

      createdManicureService = await serviceSeeder.createServiceWithPricing(serviceWithPricing);
      
      expect(createdManicureService).toBeDefined();
      expect(createdManicureService.id).toBeDefined();
      expect(createdManicureService.name).toBe(manicureServiceData.name);
      expect(createdManicureService.business_id).toBe(createdBusiness.id);
      expect(createdManicureService.has_price_components).toBe(true);

      // Test component was created
      const serviceComponents = await priceComponentRepo.findAll({}, { service_id: createdManicureService.id });
      expect(serviceComponents).toHaveLength(1);
      
      const manicureComponent = serviceComponents[0];
      expect(manicureComponent.name).toBe('Manicure Fee');
      expect(manicureComponent.pricing_method).toBe('fixed');
      expect(manicureComponent.has_tiers).toBe(false);
      expect(manicureComponent.tier_unit_label).toBe(null);

      // Test tier was created
      const componentTiers = await priceComponentTierRepo.findAll({}, { price_component_id: manicureComponent.id });
      expect(componentTiers).toHaveLength(1);
      expect(componentTiers[0].price).toBe(60.00);
      expect(componentTiers[0].duration_estimate_mins).toBe(60);
    });
  });

  describe('CRUD Operations for Removal Service', () => {
    test('should read the created removal service', async () => {
      const service = await serviceSeeder['repository'].findOne({ id: createdRemovalService.id });
      
      expect(service).toBeDefined();
      expect(service?.id).toBe(createdRemovalService.id);
      expect(service?.name).toBe(removalServiceData.name);
    });

    test('should update the removal service', async () => {
      const updatedData = {
        name: 'Updated Local Removals',
        description: 'Updated professional moving services'
      };

      const updatedService = await serviceSeeder['repository'].updateOne(
        { id: createdRemovalService.id }, 
        updatedData
      );
      
      expect(updatedService).toBeDefined();
      expect(updatedService.name).toBe(updatedData.name);
      expect(updatedService.description).toBe(updatedData.description);
      expect(updatedService.business_id).toBe(createdBusiness.id);
    });

    test('should list services for the business', async () => {
      const services = await serviceSeeder['repository'].findAll({}, { business_id: createdBusiness.id });
      
      expect(services.length).toBeGreaterThanOrEqual(2); // At least removal and manicure
      expect(services.some((s: Service) => s.id === createdRemovalService.id)).toBe(true);
      expect(services.some((s: Service) => s.id === createdManicureService.id)).toBe(true);
    });
  });

  describe('CRUD Operations for Manicure Service', () => {
    test('should read the created manicure service', async () => {
      const service = await serviceSeeder['repository'].findOne({ id: createdManicureService.id });
      
      expect(service).toBeDefined();
      expect(service?.id).toBe(createdManicureService.id);
      expect(service?.name).toBe(manicureServiceData.name);
    });

    test('should update the manicure service', async () => {
      const updatedData = {
        name: 'Premium Manicure',
        description: 'Premium manicure service with nail art'
      };

      const updatedService = await serviceSeeder['repository'].updateOne(
        { id: createdManicureService.id }, 
        updatedData
      );
      
      expect(updatedService).toBeDefined();
      expect(updatedService.name).toBe(updatedData.name);
      expect(updatedService.description).toBe(updatedData.description);
      expect(updatedService.business_id).toBe(createdBusiness.id);
    });

    test('should delete the manicure service', async () => {
      await cleanupService(createdManicureService.id);
      
      const deletedService = await serviceSeeder['repository'].findOne({ id: createdManicureService.id });
      expect(deletedService).toBeNull();
      
      createdManicureService = null!;
    });
  });
});
