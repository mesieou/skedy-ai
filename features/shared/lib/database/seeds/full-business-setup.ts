/**
 * Full Business Setup Seeder
 *
 * Creates a complete business environment with:
 * - 1 Business (removalist company)
 * - 1 Admin/Provider user
 * - 1 Provider user
 * - 1 Customer user
 * - Calendar settings for both providers
 * - Business services
 * - Availability slots
 * - No hardcoded values - uses existing data generators
 */

import { BusinessSeeder } from './business-seeder';
import { UserSeeder } from './user-seeder';
import { AuthUserSeeder } from './auth-user-seeder';
import { ServiceSeeder } from './service-seeder';
import { CalendarSettingsSeeder } from './calendar-settings-seeder';
import { AvailabilitySlotsSeeder } from './availability-slots-seeder';
import { AvailabilitySlotsRepository } from '../repositories/availability-slots-repository';

// Import existing data generators (no hardcoding)
import { removalistExample1ServiceData } from './data/services-data';
import { weekdayCalendarSettingsData, weekendCalendarSettingsData } from './data/calendar-settings-data';

import type { Business } from '../types/business';
import type { User } from '../types/user';
import type { Service } from '../types/service';
import type { CalendarSettings } from '../types/calendar-settings';
import type { AvailabilitySlots } from '../types/availability-slots';
import { DateUtils } from '../../../utils/date-utils';

export interface FullBusinessSetup {
  business: Business;
  adminProvider: User;
  provider: User;
  customer: User;
  services: Service[];
  calendarSettings: CalendarSettings[];
  availabilitySlots: AvailabilitySlots;
}

export class FullBusinessSetupSeeder {
  private businessSeeder: BusinessSeeder;
  private userSeeder: UserSeeder;
  private authUserSeeder: AuthUserSeeder;
  private serviceSeeder: ServiceSeeder;
  private calendarSettingsSeeder: CalendarSettingsSeeder;
  private availabilitySlotsSeeder: AvailabilitySlotsSeeder;
  private availabilitySlotsRepository: AvailabilitySlotsRepository;

  constructor() {
    this.businessSeeder = new BusinessSeeder();
    this.authUserSeeder = new AuthUserSeeder();
    this.userSeeder = new UserSeeder(this.authUserSeeder);
    this.serviceSeeder = new ServiceSeeder();
    this.calendarSettingsSeeder = new CalendarSettingsSeeder();
    this.availabilitySlotsSeeder = new AvailabilitySlotsSeeder();
    this.availabilitySlotsRepository = new AvailabilitySlotsRepository();
  }

  /**
   * Create a complete business setup
   */
  async createFullBusinessSetup(): Promise<FullBusinessSetup> {
    console.log('🏗️ Starting full business setup...');

    try {
      // Step 1: Create Business (using existing data generator)
      console.log('📊 Creating business...');
      const business = await this.businessSeeder.createUniqueRemovalistBusiness();
      console.log(`✅ Business created: ${business.name} (ID: ${business.id})`);

      // Step 2: Create Users
      console.log('👥 Creating users...');

      // Admin/Provider user (can manage business + provide services)
      const adminProvider = await this.userSeeder.createUniqueAdminProviderUser(business.id);
      console.log(`✅ Admin/Provider created: ${adminProvider.email} (ID: ${adminProvider.id})`);

      // Regular Provider user (provides services only)
      const provider = await this.userSeeder.createUniqueProviderUser(business.id);
      console.log(`✅ Provider created: ${provider.email} (ID: ${provider.id})`);

      // Customer user (books services)
      const customer = await this.userSeeder.createUniqueCustomerUser(business.id);
      console.log(`✅ Customer created: ${customer.email} (ID: ${customer.id})`);

      // Step 3: Create Services (using existing service data)
      console.log('🛠️ Creating services...');
      const serviceData = {
        ...removalistExample1ServiceData,
        business_id: business.id // Replace placeholder with actual business ID
      };
      const service = await this.serviceSeeder.createWithRequirements(serviceData);
      console.log(`✅ Service created: ${service.name} (ID: ${service.id})`);

      // Step 4: Create Calendar Settings for Providers
      console.log('📅 Creating calendar settings...');

      // Weekday calendar for admin/provider
      const adminCalendarData = {
        ...weekdayCalendarSettingsData,
        user_id: adminProvider.id // Replace placeholder with actual user ID
      };
      const adminCalendarSettings = await this.calendarSettingsSeeder.createCalendarSettingsWith(adminCalendarData);
      console.log(`✅ Admin calendar settings created (ID: ${adminCalendarSettings.id})`);

      // Weekend calendar for regular provider
      const providerCalendarData = {
        ...weekendCalendarSettingsData,
        user_id: provider.id // Replace placeholder with actual user ID
      };
      const providerCalendarSettings = await this.calendarSettingsSeeder.createCalendarSettingsWith(providerCalendarData);
      console.log(`✅ Provider calendar settings created (ID: ${providerCalendarSettings.id})`);

      // Step 5: Generate Availability Slots (using existing logic from test)
      console.log('🕐 Generating availability slots...');
      const tomorrowDate = DateUtils.addDaysUTC(DateUtils.nowUTC(), 1);
      const providers = [adminProvider, provider];
      const calendarSettings = [adminCalendarSettings, providerCalendarSettings];

      const availabilitySlots = await this.availabilitySlotsRepository.generateInitialBusinessAvailability(
        business.id,
        tomorrowDate,
        providers,
        calendarSettings,
        30 // 30 days of availability
      );
      console.log(`✅ Availability slots generated (ID: ${availabilitySlots.id})`);

      // Return complete setup
      const setup: FullBusinessSetup = {
        business,
        adminProvider,
        provider,
        customer,
        services: [service],
        calendarSettings: [adminCalendarSettings, providerCalendarSettings],
        availabilitySlots
      };

      console.log('🎉 Full business setup completed successfully!');
      console.log('📋 Setup Summary:');
      console.log(`   Business: ${business.name} (${business.phone_number})`);
      console.log(`   Admin/Provider: ${adminProvider.email}`);
      console.log(`   Provider: ${provider.email}`);
      console.log(`   Customer: ${customer.email}`);
      console.log(`   Services: ${setup.services.length}`);
      console.log(`   Calendar Settings: ${setup.calendarSettings.length}`);
      console.log(`   Availability: ${Object.keys(availabilitySlots.slots).length} days`);

      return setup;

        } catch (error) {
      console.error('❌ Failed to create full business setup:', error);
      throw error;
    }
  }

    /**
   * Cleanup only removalist businesses and their related data
   */
    async cleanupRemovalistBusinesses(): Promise<void> {
    console.log('🧹 Cleaning up transport businesses only...');

    try {
      // Find all transport businesses (removalist companies)
      const allBusinesses = await this.businessSeeder['repository'].findAll();
      const transportBusinesses = allBusinesses.filter(b =>
        b.business_category === 'transport'
      );

      console.log(`🔍 Found ${transportBusinesses.length} transport businesses to clean up`);

      // Clean up each transport business and its related data
      for (const business of transportBusinesses) {
        console.log(`🗑️ Cleaning up business: ${business.name}`);

        // Clean up related data (cascade delete)
        const relatedUsers = await this.userSeeder['repository'].findAll({}, { business_id: business.id });
        for (const user of relatedUsers) {
          await this.calendarSettingsSeeder['repository'].deleteOne({ user_id: user.id });
          await this.userSeeder['repository'].deleteOne({ id: user.id });
        }

        await this.availabilitySlotsSeeder['repository'].deleteOne({ business_id: business.id });
        await this.serviceSeeder['repository'].findAll({}, { business_id: business.id }).then(services => {
          return Promise.all(services.map(s => this.serviceSeeder['repository'].deleteOne({ id: s.id })));
        });
        await this.businessSeeder['repository'].deleteOne({ id: business.id });
      }

      console.log('✅ Transport business cleanup completed');
    } catch (error) {
      console.error('❌ Transport cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup all seeded data (for testing)
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up all seeded data...');

    try {
      await this.availabilitySlotsSeeder.cleanup();
      await this.calendarSettingsSeeder.cleanup();
      await this.serviceSeeder.cleanup();
      await this.userSeeder.cleanup();
      await this.authUserSeeder.cleanup();
      await this.businessSeeder.cleanup();

      console.log('✅ Cleanup completed successfully');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  }
}

// Export singleton instance for easy use
export const fullBusinessSetupSeeder = new FullBusinessSetupSeeder();
