/**
 * Skedy Business Setup Seeder
 *
 * Creates a complete Skedy business environment with:
 * - 1 Business (Skedy AI)
 * - 1 Super Admin user (Juan Bernal)
 * - 1 AI Agent Service
 * - No calendar settings (AI agent doesn't need scheduling)
 * - No availability slots (AI agent is always available)
 * - Uses all Skedy-specific data we created
 */

import { BusinessSeeder } from './business-seeder';
import { UserSeeder } from './user-seeder';
import { AuthUserSeeder } from './auth-user-seeder';
import { ServiceSeeder } from './service-seeder';
import { FrequentQuestionsSeeder } from './frequent-questions-seeder';

// Import Skedy-specific data
import { createSuperAdminAuthUserData } from './data/auth-user-data';
import { createSuperAdminUserData } from './data/user-data';
import { skedyAIAgentServiceData } from './data/services-data';

import type { Business } from '../types/business';
import type { User } from '../types/user';
import type { Service } from '../types/service';
import type { FrequentQuestion } from '../types/frequent-questions';

export interface SkedyBusinessSetup {
  business: Business;
  superAdmin: User;
  service: Service;
  frequentQuestions: FrequentQuestion[];
}

export class SkedyBusinessSetupSeeder {
  private businessSeeder: BusinessSeeder;
  private userSeeder: UserSeeder;
  private authUserSeeder: AuthUserSeeder;
  private serviceSeeder: ServiceSeeder;
  private frequentQuestionsSeeder: FrequentQuestionsSeeder;

  constructor() {
    this.businessSeeder = new BusinessSeeder();
    this.authUserSeeder = new AuthUserSeeder();
    this.userSeeder = new UserSeeder(this.authUserSeeder);
    this.serviceSeeder = new ServiceSeeder();
    this.frequentQuestionsSeeder = new FrequentQuestionsSeeder();
  }

  /**
   * Create complete Skedy business setup
   */
  async createSkedyBusinessSetup(): Promise<SkedyBusinessSetup> {
    console.log('🤖 Starting Skedy business setup...');

    try {
      // Step 1: Create Skedy Business
      console.log('🏢 Creating Skedy business...');
      const business = await this.businessSeeder.createSkedyBusiness();
      console.log(`✅ Skedy business created: ${business.name} (ID: ${business.id})`);

      // Step 2: Create Super Admin User (Juan Bernal)
      console.log('👤 Creating super admin user...');

      // Create both auth user and user profile together
      const userData = createSuperAdminUserData(business.id);
      const authUserData = createSuperAdminAuthUserData();
      const superAdmin = await this.userSeeder.createUserWith(userData, authUserData);
      console.log(`✅ Super admin created: ${superAdmin.first_name} ${superAdmin.last_name} (${superAdmin.email})`);

      // Step 3: Create AI Agent Service
      console.log('🤖 Creating AI Agent service...');
      const serviceData = {
        ...skedyAIAgentServiceData,
        business_id: business.id // Replace placeholder with actual business ID
      };
      const service = await this.serviceSeeder.createWithRequirements(serviceData);
      console.log(`✅ AI Agent service created: ${service.name} (ID: ${service.id})`);
      if (service.pricing_config && service.pricing_config.components.length > 0) {
        const component = service.pricing_config.components[0];
        console.log(`   Pricing tiers: ${component.tiers.length}`);
        if (component.tiers.length >= 3) {
          console.log(`   Lite: $${component.tiers[0].price}/min (0-500 min)`);
          console.log(`   Standard: $${component.tiers[1].price}/min (501-1,500 min)`);
          console.log(`   Pro: $${component.tiers[2].price}/min (1,501+ min)`);
        }
      }

      // Step 4: Create Frequent Questions
      console.log('❓ Creating frequent questions...');
      const frequentQuestions = await this.frequentQuestionsSeeder.createSkedyFrequentQuestions(business.id);
      console.log(`✅ Created ${frequentQuestions.length} frequent questions for Skedy`);

      // Return complete setup
      const setup: SkedyBusinessSetup = {
        business,
        superAdmin,
        service,
        frequentQuestions
      };

      console.log('🎉 Skedy business setup completed successfully!');
      console.log('📋 Setup Summary:');
      console.log(`   Business: ${business.name}`);
      console.log(`   Email: ${business.email}`);
      console.log(`   Phone: ${business.phone_number}`);
      console.log(`   Address: ${business.address}`);
      console.log(`   Super Admin: ${superAdmin.first_name} ${superAdmin.last_name} (${superAdmin.email})`);
      console.log(`   Service: ${service.name}`);
      console.log(`   Frequent Questions: ${frequentQuestions.length}`);
      console.log(`   Category: ${business.business_category}`);
      console.log(`   Timezone: ${business.time_zone}`);
      console.log('   Note: No calendar settings or availability - AI agent works 24/7!');

      return setup;

    } catch (error) {
      console.error('❌ Failed to create Skedy business setup:', error);
      throw error;
    }
  }

  /**
   * Cleanup only Skedy business and related data
   */
  async cleanupSkedyBusiness(): Promise<void> {
    console.log('🧹 Cleaning up Skedy business...');

    try {
      // Find Skedy business (by email or name)
      const allBusinesses = await this.businessSeeder['repository'].findAll();
      const skedyBusiness = allBusinesses.find(b =>
        b.email === 'info@skedy.io' || b.name === 'Skedy'
      );

      if (!skedyBusiness) {
        console.log('ℹ️ No Skedy business found to clean up');
        return;
      }

      console.log(`🗑️ Cleaning up Skedy business: ${skedyBusiness.name}`);

      // Clean up related data
      const relatedUsers = await this.userSeeder['repository'].findAll({}, { business_id: skedyBusiness.id });
      for (const user of relatedUsers) {
        await this.userSeeder['repository'].deleteOne({ id: user.id });
        console.log(`   Deleted user: ${user.email}`);
      }

      // Clean up services
      const services = await this.serviceSeeder['repository'].findAll({}, { business_id: skedyBusiness.id });
      for (const service of services) {
        await this.serviceSeeder['repository'].deleteOne({ id: service.id });
        console.log(`   Deleted service: ${service.name}`);
      }

      // Clean up frequent questions
      const questions = await this.frequentQuestionsSeeder['repository'].findAll({}, { business_id: skedyBusiness.id });
      for (const question of questions) {
        await this.frequentQuestionsSeeder['repository'].deleteOne({ id: question.id });
        console.log(`   Deleted question: ${question.title}`);
      }

      // Clean up business
      await this.businessSeeder['repository'].deleteOne({ id: skedyBusiness.id });
      console.log(`   Deleted business: ${skedyBusiness.name}`);

      console.log('✅ Skedy business cleanup completed');
    } catch (error) {
      console.error('❌ Skedy cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup all seeded data (for testing)
   */
  // async cleanup(): Promise<void> {
  //   console.log('🧹 Cleaning up all seeded data...');

  //   try {
  //     await this.frequentQuestionsSeeder.cleanup();
  //     await this.serviceSeeder.cleanup();
  //     await this.userSeeder.cleanup();
  //     await this.authUserSeeder.cleanup();
  //     await this.businessSeeder.cleanup();

  //     console.log('✅ Cleanup completed successfully');
  //   } catch (error) {
  //     console.error('❌ Cleanup failed:', error);
  //     throw error;
  //   }
  // }
}

// Export singleton instance for easy use
export const skedyBusinessSetupSeeder = new SkedyBusinessSetupSeeder();
