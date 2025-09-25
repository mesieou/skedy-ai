#!/usr/bin/env tsx

/**
 * Setup Removalist Business Script
 *
 * Creates a complete removalist business setup for development/testing
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables (same as Jest)
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env.test'), override: true });

import { BusinessSeeder } from '../features/shared/lib/database/seeds/business-seeder';
import { UserSeeder } from '../features/shared/lib/database/seeds/user-seeder';
import { AuthUserSeeder } from '../features/shared/lib/database/seeds/auth-user-seeder';
import { ServiceSeeder } from '../features/shared/lib/database/seeds/service-seeder';
import { CalendarSettingsSeeder } from '../features/shared/lib/database/seeds/calendar-settings-seeder';
import { AvailabilitySlotsRepository } from '../features/shared/lib/database/repositories/availability-slots-repository';
import { BusinessToolsRepository } from '../features/shared/lib/database/repositories/business-tools-repository';
import { BusinessPromptRepository } from '../features/shared/lib/database/repositories/business-prompt-repository';
import { ToolsSeeder } from '../features/shared/lib/database/seeds/tools-seeder';
import { PromptsSeeder } from '../features/shared/lib/database/seeds/prompts-seeder';
import { removalistExample1ServiceData } from '../features/shared/lib/database/seeds/data/services-data';
import { weekdayCalendarSettingsData, weekendCalendarSettingsData } from '../features/shared/lib/database/seeds/data/calendar-settings-data';
import { DateUtils } from '../features/shared/utils/date-utils';
import { initializeTestDatabase } from '../features/shared/lib/test-setup';

async function main() {
  try {
    console.log('🚀 Starting removalist business setup...\n');

    // Initialize database client
    console.log('🔧 Initializing database client...');
    await initializeTestDatabase();

    // Initialize seeders
    const businessSeeder = new BusinessSeeder();
    const authUserSeeder = new AuthUserSeeder();
    const userSeeder = new UserSeeder(authUserSeeder);
    const serviceSeeder = new ServiceSeeder();
    const calendarSettingsSeeder = new CalendarSettingsSeeder();
    const availabilitySlotsRepository = new AvailabilitySlotsRepository();
    const businessToolsRepository = new BusinessToolsRepository();
    const businessPromptRepository = new BusinessPromptRepository();
    const toolsSeeder = new ToolsSeeder();
    const promptsSeeder = new PromptsSeeder();

    // Step 1: Create Business
    console.log('📊 Creating business...');
    const business = await businessSeeder.createTigaRemovalistBusiness();
    console.log(`✅ Business created: ${business.name} (ID: ${business.id})`);

    // Step 2: Create Users
    console.log('👥 Creating users...');
    const providers = [];

    const adminProvider = await userSeeder.createUniqueAdminProviderUser(business.id);
    console.log(`✅ Admin/Provider created: ${adminProvider.email}`);
    providers.push(adminProvider);

    let provider = null;
    if (business.number_of_providers >= 2) {
      provider = await userSeeder.createUniqueProviderUser(business.id);
      console.log(`✅ Provider created: ${provider.email}`);
      providers.push(provider);
    }

    const customer = await userSeeder.createUniqueCustomerUser(business.id);
    console.log(`✅ Customer created: ${customer.email}`);

    // Step 3: Create Services
    console.log('🛠️ Creating services...');
    const serviceData = { ...removalistExample1ServiceData, business_id: business.id };
    const service = await serviceSeeder.createWithRequirements(serviceData);
    console.log(`✅ Service created: ${service.name}`);

    // Step 4: Create Calendar Settings
    console.log('📅 Creating calendar settings...');
    const calendarSettings = [];
    for (let i = 0; i < providers.length; i++) {
      const calendarData = i === 0 ? weekdayCalendarSettingsData : weekendCalendarSettingsData;
      const settings = await calendarSettingsSeeder.createCalendarSettingsWith({
        ...calendarData,
        user_id: providers[i].id
      });
      calendarSettings.push(settings);
      console.log(`✅ Calendar settings created for provider ${i + 1}`);
    }

    // Step 5: Generate Availability
    console.log('🕐 Generating availability slots...');
    const tomorrowDate = DateUtils.addDaysUTC(DateUtils.nowUTC(), 1);
    const tomorrowBusinessDate = DateUtils.extractDateString(tomorrowDate);
    await availabilitySlotsRepository.generateInitialBusinessAvailability(
      business.id,
      tomorrowBusinessDate,
      providers,
      calendarSettings,
      business.time_zone,
      30
    );
    console.log(`✅ Availability slots generated`);

    // Step 6: Link Tools
    console.log('🔧 Linking business tools...');
    const { removalistTools } = await import('../features/shared/lib/database/seeds/data/tools-data');
    let businessToolsCount = 0;

    for (const toolData of removalistTools) {
      const tool = await toolsSeeder.findOne({
        name: toolData.name,
        version: toolData.version
      });

      if (tool) {
        await businessToolsRepository.create({
          business_id: business.id,
          tool_id: tool.id,
          active: true
        });
        businessToolsCount++;
      }
    }
    console.log(`✅ Added ${businessToolsCount} tools to business`);

    // Step 7: Link Existing Removalist Prompts to Business
    console.log('📝 Linking removalist prompts to business...');
    const removalistPrompts = await promptsSeeder.findAll({
      business_category: 'removalist'
    });

    let businessPromptsCount = 0;
    for (const prompt of removalistPrompts) {
      await businessPromptRepository.create({
        business_id: business.id,
        prompt_id: prompt.id,
        is_active: true
      });
      businessPromptsCount++;
    }
    console.log(`✅ Linked ${businessPromptsCount} prompts to business`);

    console.log('\n🎉 Removalist business setup completed!');
    console.log('📋 Setup Summary:');
    console.log(`   Business: ${business.name} (${business.phone_number})`);
    console.log(`   Admin/Provider: ${adminProvider.email}`);
    if (provider) console.log(`   Provider: ${provider.email}`);
    console.log(`   Customer: ${customer.email}`);
    console.log(`   Services: 1`);
    console.log(`   Calendar Settings: ${calendarSettings.length}`);
    console.log(`   Business Tools: ${businessToolsCount}`);
    console.log(`   Business Prompts: ${businessPromptsCount}`);

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
